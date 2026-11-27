import type { Table } from 'dexie'
import { strFromU8, unzipSync } from 'fflate'
import { nowISO } from '@/lib/id'
import { db } from '../db'
import { backupDataSchema, backupManifestSchema } from '../schema'
import type { BackupData, BackupManifest, CoverMeta } from '../schema'
import type { Book, Cover, Goal, Session, Settings, Tombstone } from '../types'
import { BACKUP_SCHEMA_VERSION, normalizeBackup } from './normalize'

export type ImportMode = 'merge' | 'replace'

export type ImportSummary = {
  added: Record<string, number>
  updated: Record<string, number>
  skipped: number
  covers: number
}

type ReadResult = {
  manifest: BackupManifest
  data: BackupData
  covers: Map<string, Blob>
}

type MergeCount = { added: number; updated: number; skipped: number }

type Stats = { readingMs: number; count: number; pages: number }

const TABLES = [
  db.books,
  db.readings,
  db.sessions,
  db.quotes,
  db.journals,
  db.characters,
  db.bookNotes,
  db.bookLinks,
  db.goals,
  db.covers,
  db.tombstones,
  db.settings,
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    throw new Error('Файл повреждён или не является бэкапом')
  }
}

function parseManifest(raw: unknown): BackupManifest {
  const manifest = backupManifestSchema.parse(raw)
  if (manifest.schemaVersion > BACKUP_SCHEMA_VERSION) {
    throw new Error('Файл из более новой версии приложения')
  }
  return manifest
}

function parseData(raw: unknown, schemaVersion: number): BackupData {
  if (!isRecord(raw) || !Object.values(raw).some(Array.isArray)) {
    throw new Error('В файле нет таблиц бэкапа')
  }
  return backupDataSchema.parse(normalizeBackup(raw, schemaVersion))
}

function isZip(bytes: Uint8Array): boolean {
  return bytes[0] === 0x50 && bytes[1] === 0x4b
}

function readZipBackup(bytes: Uint8Array): ReadResult {
  const entries = unzipSync(bytes)
  const manifestEntry = entries['manifest.json']
  const dataEntry = entries['data.json']

  if (!manifestEntry || !dataEntry) {
    throw new Error('В архиве нет manifest.json или data.json')
  }

  const manifest = parseManifest(parseJson(strFromU8(manifestEntry)))
  const data = parseData(parseJson(strFromU8(dataEntry)), manifest.schemaVersion)
  const covers = new Map<string, Blob>()

  for (const [name, entry] of Object.entries(entries)) {
    if (!name.startsWith('covers/') || !name.endsWith('.jpg')) continue
    const id = name.slice('covers/'.length, -'.jpg'.length)
    if (id) covers.set(id, new Blob([entry], { type: 'image/jpeg' }))
  }

  return { manifest, data, covers }
}

function readJsonBackup(bytes: Uint8Array): ReadResult {
  const parsed = parseJson(new TextDecoder().decode(bytes))
  if (!isRecord(parsed)) throw new Error('Файл не является бэкапом')
  if (!isRecord(parsed.data)) throw new Error('В файле нет данных бэкапа')

  const manifest = parseManifest(parsed.manifest)
  return {
    manifest,
    data: parseData(parsed.data, manifest.schemaVersion),
    covers: new Map(),
  }
}

export async function readBackup(file: Blob): Promise<ReadResult> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  return isZip(bytes) ? readZipBackup(bytes) : readJsonBackup(bytes)
}

function emptyCounts(): Record<string, number> {
  return {
    books: 0,
    readings: 0,
    sessions: 0,
    quotes: 0,
    journals: 0,
    characters: 0,
    bookNotes: 0,
    bookLinks: 0,
    goals: 0,
    tombstones: 0,
  }
}

function tally(target: Record<string, number>, key: string, count: number): void {
  if (count > 0) target[key] = (target[key] ?? 0) + count
}

function sessionKey(session: Session): string {
  return `${session.bookId}|${session.startedAt}|${session.durationMs}`
}

function mergeKey(tombstone: Tombstone): string {
  return `${tombstone.entity}|${tombstone.entityId}`
}

async function mergeBooks(incoming: Book[], affected: Set<string>): Promise<MergeCount> {
  const byId = new Map<string, Book>()
  const byIsbn = new Map<string, Book>()

  for (const book of await db.books.toArray()) {
    byId.set(book.id, book)
    if (book.isbn13) byIsbn.set(book.isbn13, book)
  }

  let added = 0
  let updated = 0
  let skipped = 0

  for (const book of incoming) {
    const target = byId.get(book.id) ?? (book.isbn13 ? byIsbn.get(book.isbn13) : undefined)

    if (!target) {
      await db.books.put(book)
      byId.set(book.id, book)
      if (book.isbn13) byIsbn.set(book.isbn13, book)
      affected.add(book.id)
      added += 1
      continue
    }

    if (book.updatedAt > target.updatedAt) {
      const merged: Book = { ...target, ...book, id: target.id }
      await db.books.put(merged)
      byId.set(merged.id, merged)
      if (merged.isbn13) byIsbn.set(merged.isbn13, merged)
      affected.add(merged.id)
      updated += 1
    } else {
      skipped += 1
    }
  }

  return { added, updated, skipped }
}

async function mergeSessions(incoming: Session[], affected: Set<string>): Promise<MergeCount> {
  const existing = await db.sessions.toArray()
  const ids = new Set(existing.map((session) => session.id))
  const keys = new Set(existing.map(sessionKey))

  let added = 0
  let skipped = 0

  for (const session of incoming) {
    if (ids.has(session.id) || keys.has(sessionKey(session))) {
      skipped += 1
      continue
    }

    await db.sessions.put(session)
    ids.add(session.id)
    keys.add(sessionKey(session))
    affected.add(session.bookId)
    added += 1
  }

  return { added, updated: 0, skipped }
}

async function mergeNewer<T extends { id: string; updatedAt: string }>(
  incoming: T[],
  table: Table<T, string>,
): Promise<MergeCount> {
  const existing = new Map((await table.toArray()).map((row) => [row.id, row]))

  let added = 0
  let updated = 0
  let skipped = 0

  for (const row of incoming) {
    const current = existing.get(row.id)

    if (!current) {
      await table.put(row)
      existing.set(row.id, row)
      added += 1
      continue
    }

    if (row.updatedAt > current.updatedAt) {
      await table.put(row)
      existing.set(row.id, row)
      updated += 1
    } else {
      skipped += 1
    }
  }

  return { added, updated, skipped }
}

async function mergeGoals(incoming: Goal[]): Promise<MergeCount> {
  const byYear = new Map((await db.goals.toArray()).map((goal) => [goal.year, goal]))

  let added = 0
  let updated = 0
  let skipped = 0

  for (const goal of incoming) {
    const target = byYear.get(goal.year)

    if (!target) {
      await db.goals.put(goal)
      byYear.set(goal.year, goal)
      added += 1
      continue
    }

    if (goal.updatedAt > target.updatedAt) {
      const merged: Goal = { ...target, ...goal, id: target.id }
      await db.goals.put(merged)
      byYear.set(goal.year, merged)
      updated += 1
    } else {
      skipped += 1
    }
  }

  return { added, updated, skipped }
}

async function mergeTombstones(incoming: Tombstone[]): Promise<MergeCount> {
  const byKey = new Map<string, Tombstone>()

  for (const tombstone of await db.tombstones.toArray()) {
    byKey.set(mergeKey(tombstone), tombstone)
  }

  let added = 0
  let updated = 0
  let skipped = 0

  for (const tombstone of incoming) {
    const key = mergeKey(tombstone)
    const target = byKey.get(key)

    if (!target) {
      await db.tombstones.put(tombstone)
      byKey.set(key, tombstone)
      added += 1
      continue
    }

    if (tombstone.deletedAt > target.deletedAt) {
      const merged: Tombstone = { ...tombstone, id: target.id }
      await db.tombstones.put(merged)
      byKey.set(key, merged)
      updated += 1
    } else {
      skipped += 1
    }
  }

  return { added, updated, skipped }
}

async function writeCovers(
  metas: CoverMeta[],
  blobs: Map<string, Blob>,
): Promise<{ written: number; skipped: number }> {
  const existing = new Set((await db.covers.toArray()).map((cover) => cover.id))

  let written = 0
  let skipped = 0

  for (const meta of metas) {
    const blob = blobs.get(meta.id)
    if (existing.has(meta.id) || !blob) {
      skipped += 1
      continue
    }

    const cover: Cover = { ...meta, blob }
    await db.covers.put(cover)
    existing.add(meta.id)
    written += 1
  }

  return { written, skipped }
}

async function recalcStats(bookIds: Set<string>): Promise<void> {
  if (bookIds.size === 0) return

  const ids = [...bookIds]
  const sessions = await db.sessions.where('bookId').anyOf(ids).toArray()
  const totals = new Map<string, Stats>()

  for (const session of sessions) {
    const stats = totals.get(session.bookId) ?? { readingMs: 0, count: 0, pages: 0 }
    stats.readingMs += session.durationMs
    stats.count += 1
    stats.pages += session.pagesRead
    totals.set(session.bookId, stats)
  }

  for (const id of ids) {
    const stats = totals.get(id) ?? { readingMs: 0, count: 0, pages: 0 }
    await db.books.update(id, {
      totalReadingMs: stats.readingMs,
      sessionCount: stats.count,
      pagesReadTotal: stats.pages,
    })
  }
}

async function touchSettings(): Promise<void> {
  const now = nowISO()
  const current = await db.settings.get('app')

  if (current) {
    const next: Settings = {
      ...current,
      lastBackupAt: now,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      updatedAt: now,
    }
    await db.settings.put(next)
    return
  }

  await db.settings.put({
    id: 'app',
    onboardingDone: true,
    defaultStatus: 'want',
    defaultTemplate: 'lite',
    defaultRatingScale: 'stars5',
    dailyGoalMinutes: 0,
    theme: 'lavender',
    themeMode: 'light',
    lastBackupAt: now,
    persistGranted: false,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
  })
}

async function replaceAll(data: BackupData, covers: Map<string, Blob>): Promise<ImportSummary> {
  await db.books.clear()
  await db.readings.clear()
  await db.sessions.clear()
  await db.quotes.clear()
  await db.journals.clear()
  await db.characters.clear()
  await db.bookNotes.clear()
  await db.bookLinks.clear()
  await db.goals.clear()
  await db.covers.clear()
  await db.tombstones.clear()

  await db.books.bulkPut(data.books)
  await db.readings.bulkPut(data.readings)
  await db.sessions.bulkPut(data.sessions)
  await db.quotes.bulkPut(data.quotes)
  await db.journals.bulkPut(data.journals)
  await db.characters.bulkPut(data.characters)
  await db.bookNotes.bulkPut(data.bookNotes)
  await db.bookLinks.bulkPut(data.bookLinks)
  await db.goals.bulkPut(data.goals)
  await db.tombstones.bulkPut(data.tombstones)

  const coverResult = await writeCovers(data.covers, covers)
  const affected = new Set<string>()
  for (const book of data.books) affected.add(book.id)
  for (const session of data.sessions) affected.add(session.bookId)
  await recalcStats(affected)

  return {
    added: {
      books: data.books.length,
      readings: data.readings.length,
      sessions: data.sessions.length,
      quotes: data.quotes.length,
      journals: data.journals.length,
      characters: data.characters.length,
      bookNotes: data.bookNotes.length,
      bookLinks: data.bookLinks.length,
      goals: data.goals.length,
      tombstones: data.tombstones.length,
    },
    updated: emptyCounts(),
    skipped: coverResult.skipped,
    covers: coverResult.written,
  }
}

async function mergeAll(data: BackupData, covers: Map<string, Blob>): Promise<ImportSummary> {
  const added = emptyCounts()
  const updated = emptyCounts()
  let skipped = 0

  const affected = new Set<string>()
  const books = await mergeBooks(data.books, affected)
  const readings = await mergeNewer(data.readings, db.readings)
  const sessions = await mergeSessions(data.sessions, affected)
  const quotes = await mergeNewer(data.quotes, db.quotes)
  const journals = await mergeNewer(data.journals, db.journals)
  const characters = await mergeNewer(data.characters, db.characters)
  const bookNotes = await mergeNewer(data.bookNotes, db.bookNotes)
  const bookLinks = await mergeNewer(data.bookLinks, db.bookLinks)
  const goals = await mergeGoals(data.goals)
  const tombstones = await mergeTombstones(data.tombstones)

  const results: [string, MergeCount][] = [
    ['books', books],
    ['readings', readings],
    ['sessions', sessions],
    ['quotes', quotes],
    ['journals', journals],
    ['characters', characters],
    ['bookNotes', bookNotes],
    ['bookLinks', bookLinks],
    ['goals', goals],
    ['tombstones', tombstones],
  ]

  for (const [key, result] of results) {
    tally(added, key, result.added)
    tally(updated, key, result.updated)
    skipped += result.skipped
  }

  const coverResult = await writeCovers(data.covers, covers)
  skipped += coverResult.skipped
  await recalcStats(affected)

  return { added, updated, skipped, covers: coverResult.written }
}

export async function importBackup(file: Blob, mode: ImportMode = 'merge'): Promise<ImportSummary> {
  const { data, covers } = await readBackup(file)

  return db.transaction('rw', [...TABLES], async () => {
    const summary =
      mode === 'replace' ? await replaceAll(data, covers) : await mergeAll(data, covers)
    await touchSettings()
    return summary
  })
}
