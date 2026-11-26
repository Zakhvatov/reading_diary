import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { nowISO } from '@/lib/id'
import { db } from '../db'
import { createBook } from '../repositories/books'
import { saveCover } from '../repositories/covers'
import { addSession } from '../repositories/sessions'
import { getSettings } from '../repositories/settings'
import type { BackupData, BackupManifest } from '../schema'
import type { Book, Session } from '../types'
import { exportBackupJson, exportBackupZip } from './export'
import { importBackup, readBackup } from './import'
import { BACKUP_SCHEMA_VERSION } from './normalize'

const EMPTY: BackupData = {
  books: [],
  readings: [],
  sessions: [],
  quotes: [],
  journals: [],
  characters: [],
  bookNotes: [],
  bookLinks: [],
  goals: [],
  settings: [],
  tombstones: [],
  covers: [],
}

function makeBook(overrides: Partial<Book> = {}): Book {
  const now = nowISO()
  return {
    id: 'book-1',
    title: 'Книга',
    authors: [],
    genres: [],
    status: 'reading',
    progressMode: 'pages',
    currentPage: 0,
    percent: 0,
    ratingScale: 'stars5',
    tags: [],
    moods: [],
    colorLabel: 'none',
    diaryTemplate: 'lite',
    shareable: false,
    totalReadingMs: 0,
    sessionCount: 0,
    pagesReadTotal: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeSession(overrides: Partial<Session> = {}): Session {
  const now = nowISO()
  return {
    id: 'session-1',
    bookId: 'book-1',
    day: '2026-02-01',
    startedAt: '2026-02-01T10:00:00.000Z',
    endedAt: '2026-02-01T10:30:00.000Z',
    durationMs: 30 * 60_000,
    pagesRead: 0,
    kind: 'manual',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function backupFile(data: BackupData, schemaVersion = 1): Blob {
  const manifest: BackupManifest = {
    format: 'reading-diary-backup',
    schemaVersion,
    exportedAt: nowISO(),
    appVersion: 'test',
    counts: {},
  }
  return new Blob([JSON.stringify({ manifest, data })], { type: 'application/json' })
}

async function reopenEmpty(): Promise<void> {
  await db.delete()
  await db.open()
}

beforeEach(reopenEmpty)

afterAll(() => {
  db.close()
})

describe('backup import', () => {
  it('restores a zip backup with covers in replace mode', async () => {
    const book = await createBook({ title: 'Пикник на обочине', pageCount: 300 })
    const coverBlob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/jpeg' })
    await saveCover({
      ownerType: 'book',
      ownerId: book.id,
      blob: coverBlob,
      width: 600,
      height: 900,
    })
    await addSession({
      bookId: book.id,
      startedAt: '2026-02-01T10:00:00.000Z',
      durationMs: 15 * 60_000,
      pagesRead: 12,
    })

    const file = await exportBackupZip({ appVersion: '1.2.3' })
    expect(file.type).toBe('application/zip')
    expect((await getSettings()).lastBackupAt).toBeTruthy()

    const parsed = await readBackup(file)
    expect(parsed.manifest.appVersion).toBe('1.2.3')
    expect(parsed.covers.size).toBe(1)

    await reopenEmpty()
    const summary = await importBackup(file, 'replace')

    expect(summary.added.books).toBe(1)
    expect(summary.added.sessions).toBe(1)
    expect(summary.covers).toBe(1)
    expect(await db.books.count()).toBe(1)
    expect(await db.sessions.count()).toBe(1)

    const covers = await db.covers.toArray()
    expect(covers).toHaveLength(1)
    expect(await covers[0]?.blob.size).toBe(4)
  })

  it('restores a json backup without covers', async () => {
    await createBook({ title: 'JSON' })

    const file = await exportBackupJson()
    const parsed = await readBackup(file)
    expect(parsed.data.covers).toEqual([])

    await reopenEmpty()
    const summary = await importBackup(file, 'replace')

    expect(summary.added.books).toBe(1)
    expect(await db.books.count()).toBe(1)
    expect(await db.covers.count()).toBe(0)
  })

  it('does not duplicate sessions when the same backup is merged twice', async () => {
    const book = await createBook({ title: 'Повтор' })
    await addSession({
      bookId: book.id,
      startedAt: '2026-02-02T09:00:00.000Z',
      durationMs: 20 * 60_000,
      pagesRead: 5,
    })
    const file = await exportBackupZip()

    await reopenEmpty()
    const first = await importBackup(file, 'merge')
    const second = await importBackup(file, 'merge')

    expect(first.added.books).toBe(1)
    expect(first.added.sessions).toBe(1)
    expect(second.added.books).toBe(0)
    expect(second.added.sessions).toBe(0)
    expect(second.skipped).toBeGreaterThanOrEqual(2)
    expect(await db.books.count()).toBe(1)
    expect(await db.sessions.count()).toBe(1)
  })

  it('merges an existing book by isbn13 when the incoming copy is newer', async () => {
    const existing = await createBook({ title: 'Старое', isbn13: '9785170902583' })
    const incoming = makeBook({
      id: 'another-id',
      title: 'Новое',
      isbn13: '9785170902583',
      updatedAt: '2099-01-01T00:00:00.000Z',
    })

    const summary = await importBackup(backupFile({ ...EMPTY, books: [incoming] }), 'merge')

    expect(summary.updated.books).toBe(1)
    expect(await db.books.count()).toBe(1)
    expect(await db.books.get(existing.id)).toMatchObject({ title: 'Новое' })
  })

  it('rejects a backup from a newer schema version', async () => {
    const file = backupFile({ ...EMPTY }, BACKUP_SCHEMA_VERSION + 1)

    await expect(importBackup(file, 'replace')).rejects.toThrow('более новой версии')
    expect(await db.books.count()).toBe(0)
  })

  it('converts ratings and fills deep diary defaults from a v2 backup', async () => {
    const oldBook = {
      id: 'old-book',
      title: 'Старая книга',
      authors: [],
      genres: [],
      status: 'finished',
      progressMode: 'pages',
      currentPage: 100,
      percent: 100,
      rating: 4,
      totalReadingMs: 0,
      sessionCount: 0,
      pagesReadTotal: 0,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    } as unknown as Book

    await importBackup(backupFile({ ...EMPTY, books: [oldBook] }, 2), 'replace')

    expect(await db.books.get('old-book')).toMatchObject({
      rating: 8,
      ratingScale: 'stars5',
      tags: [],
      moods: [],
      colorLabel: 'none',
      diaryTemplate: 'lite',
      shareable: false,
    })
  })

  it('moves a legacy journal photo into photoIds from a v3 backup', async () => {
    const journal = {
      id: 'old-journal',
      title: 'Запись',
      body: '',
      color: 'pine',
      photoId: 'cover-1',
      stickers: ['heart'],
      entryDate: '2026-01-01',
      tags: [],
      shareable: false,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    }

    await importBackup(
      backupFile({ ...EMPTY, journals: [journal] } as unknown as BackupData, 3),
      'replace',
    )

    expect(await db.journals.get('old-journal')).toMatchObject({
      photoIds: ['cover-1'],
      stickers: [{ id: 'legacy-0-heart', sticker: 'heart', x: 0.62, y: 0.06, rotate: -14 }],
    })
    expect(await db.journals.get('old-journal')).not.toHaveProperty('photoId')
  })

  it('keeps a canonical rating from a v3 backup as is', async () => {
    const book = makeBook({ id: 'new-book', rating: 8 })

    await importBackup(backupFile({ ...EMPTY, books: [book] }, 3), 'replace')

    expect(await db.books.get('new-book')).toMatchObject({ rating: 8, ratingScale: 'stars5' })
  })

  it('recalculates derived book stats from sessions after import', async () => {
    const book = makeBook({ totalReadingMs: 0, sessionCount: 0, pagesReadTotal: 0 })
    const session = makeSession({ bookId: book.id, durationMs: 42 * 60_000, pagesRead: 7 })

    await importBackup(backupFile({ ...EMPTY, books: [book], sessions: [session] }), 'replace')

    expect(await db.books.get(book.id)).toMatchObject({
      totalReadingMs: 42 * 60_000,
      sessionCount: 1,
      pagesReadTotal: 7,
    })
  })
})
