import { toDay } from '@/lib/dates'
import { toBoardNotes } from '@/lib/board'
import { MAX_JOURNAL_PHOTOS } from '@/lib/journal'

export const BACKUP_SCHEMA_VERSION = 6

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function dayOf(value: string, fallback: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : toDay(date)
}

function normalizeList(
  value: unknown,
  normalize: (record: JsonRecord) => JsonRecord | null,
): JsonRecord[] {
  if (!Array.isArray(value)) return []

  const result: JsonRecord[] = []
  for (const item of value) {
    if (!isRecord(item)) continue
    const normalized = normalize(item)
    if (normalized) result.push(normalized)
  }
  return result
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function normalizeBook(record: JsonRecord, sourceVersion: number): JsonRecord | null {
  const id = str(record.id)
  const title = str(record.title)
  if (!id || !title) return null

  const createdAt = str(record.createdAt, new Date().toISOString())
  const converted =
    sourceVersion < 3 && typeof record.rating === 'number' && record.rating <= 5
      ? record.rating * 2
      : record.rating
  const rating = typeof converted === 'number' && Number.isFinite(converted) ? converted : undefined

  return {
    ...record,
    id,
    title,
    authors: stringList(record.authors),
    genres: stringList(record.genres),
    status: str(record.status, 'want'),
    progressMode: str(record.progressMode, 'pages'),
    currentPage: num(record.currentPage, 0),
    percent: num(record.percent, 0),
    rating,
    ratingScale: str(record.ratingScale, 'stars5'),
    tags: stringList(record.tags),
    moods: stringList(record.moods),
    colorLabel: str(record.colorLabel, 'none'),
    diaryTemplate: str(record.diaryTemplate, 'lite'),
    shareable: typeof record.shareable === 'boolean' ? record.shareable : false,
    totalReadingMs: num(record.totalReadingMs, 0),
    sessionCount: num(record.sessionCount, 0),
    pagesReadTotal: num(record.pagesReadTotal, 0),
    createdAt,
    updatedAt: str(record.updatedAt, createdAt),
  }
}

function normalizeReading(record: JsonRecord): JsonRecord | null {
  const id = str(record.id)
  const bookId = str(record.bookId)
  if (!id || !bookId) return null

  const createdAt = str(record.createdAt, new Date().toISOString())
  return {
    ...record,
    id,
    bookId,
    status: str(record.status, str(record.finishedAt) ? 'finished' : 'reading'),
    createdAt,
    updatedAt: str(record.updatedAt, createdAt),
  }
}

function normalizeSession(record: JsonRecord): JsonRecord | null {
  const id = str(record.id)
  const bookId = str(record.bookId)
  const startedAt = str(record.startedAt)
  if (!id || !bookId || !startedAt) return null

  const durationMs = num(record.durationMs, 0)
  const started = new Date(startedAt)
  const endedAt = Number.isNaN(started.getTime())
    ? startedAt
    : str(record.endedAt) || new Date(started.getTime() + durationMs).toISOString()
  const createdAt = str(record.createdAt, new Date().toISOString())

  return {
    ...record,
    id,
    bookId,
    day: str(record.day) || dayOf(startedAt, ''),
    startedAt,
    endedAt,
    durationMs,
    pagesRead: num(record.pagesRead, 0),
    kind: str(record.kind, 'manual'),
    createdAt,
    updatedAt: str(record.updatedAt, createdAt),
  }
}

function normalizeQuote(record: JsonRecord): JsonRecord | null {
  const id = str(record.id)
  const bookId = str(record.bookId)
  const text = str(record.text)
  if (!id || !bookId || !text) return null

  const createdAt = str(record.createdAt, new Date().toISOString())
  return {
    ...record,
    id,
    bookId,
    text,
    favorite: typeof record.favorite === 'boolean' ? record.favorite : false,
    shareable: typeof record.shareable === 'boolean' ? record.shareable : false,
    createdAt,
    updatedAt: str(record.updatedAt, createdAt),
  }
}

function normalizeJournal(record: JsonRecord): JsonRecord | null {
  const id = str(record.id)
  if (!id) return null

  const createdAt = str(record.createdAt, new Date().toISOString())
  const legacyPhotoId = str(record.photoId)
  const photoIds = Array.isArray(record.photoIds)
    ? stringList(record.photoIds)
    : legacyPhotoId
      ? [legacyPhotoId]
      : []
  const next: JsonRecord = {
    ...record,
    id,
    title: str(record.title),
    body: str(record.body),
    color: str(record.color, 'pine'),
    photoIds: photoIds.slice(0, MAX_JOURNAL_PHOTOS),
    board: toBoardNotes(record.board ?? record.stickers),
    entryDate: str(record.entryDate) || dayOf(createdAt, toDay(new Date())),
    tags: stringList(record.tags),
    shareable: typeof record.shareable === 'boolean' ? record.shareable : false,
    createdAt,
    updatedAt: str(record.updatedAt, createdAt),
  }

  delete next.photoId
  delete next.stickers
  return next
}

function normalizeCharacter(record: JsonRecord): JsonRecord | null {
  const id = str(record.id)
  const bookId = str(record.bookId)
  const name = str(record.name)
  if (!id || !bookId || !name) return null

  const createdAt = str(record.createdAt, new Date().toISOString())
  return {
    ...record,
    id,
    bookId,
    name,
    note: str(record.note),
    createdAt,
    updatedAt: str(record.updatedAt, createdAt),
  }
}

function normalizeBookNote(record: JsonRecord): JsonRecord | null {
  const id = str(record.id)
  const bookId = str(record.bookId)
  if (!id || !bookId) return null

  const createdAt = str(record.createdAt, new Date().toISOString())
  return {
    ...record,
    id,
    bookId,
    kind: str(record.kind, 'plot'),
    body: str(record.body),
    tags: stringList(record.tags),
    order: num(record.order, 0),
    createdAt,
    updatedAt: str(record.updatedAt, createdAt),
  }
}

function normalizeBookLink(record: JsonRecord): JsonRecord | null {
  const id = str(record.id)
  const bookId = str(record.bookId)
  const targetTitle = str(record.targetTitle)
  if (!id || !bookId || !targetTitle) return null

  const createdAt = str(record.createdAt, new Date().toISOString())
  return {
    ...record,
    id,
    bookId,
    targetTitle,
    kind: str(record.kind, 'other'),
    createdAt,
    updatedAt: str(record.updatedAt, createdAt),
  }
}

function normalizeGoal(record: JsonRecord): JsonRecord | null {
  const id = str(record.id)
  const year = num(record.year, 0)
  const targetBooks = num(record.targetBooks, 0)
  if (!id || year < 1900 || targetBooks < 1) return null

  const createdAt = str(record.createdAt, new Date().toISOString())
  return {
    ...record,
    id,
    year,
    targetBooks,
    createdAt,
    updatedAt: str(record.updatedAt, createdAt),
  }
}

function normalizeSettings(record: JsonRecord): JsonRecord | null {
  if (str(record.id) !== 'app') return null

  const createdAt = str(record.createdAt, new Date().toISOString())
  return {
    ...record,
    id: 'app',
    onboardingDone: typeof record.onboardingDone === 'boolean' ? record.onboardingDone : true,
    defaultStatus: str(record.defaultStatus, 'want'),
    defaultTemplate: str(record.defaultTemplate, 'lite'),
    defaultRatingScale: str(record.defaultRatingScale, 'stars5'),
    dailyGoalMinutes: num(record.dailyGoalMinutes, 0),
    persistGranted: typeof record.persistGranted === 'boolean' ? record.persistGranted : false,
    schemaVersion: num(record.schemaVersion, BACKUP_SCHEMA_VERSION),
    createdAt,
    updatedAt: str(record.updatedAt, createdAt),
  }
}

function normalizeTombstone(record: JsonRecord): JsonRecord | null {
  const id = str(record.id)
  const entity = str(record.entity)
  const entityId = str(record.entityId)
  if (!id || !entity || !entityId) return null

  return {
    ...record,
    id,
    entity,
    entityId,
    deletedAt: str(record.deletedAt, new Date().toISOString()),
  }
}

function normalizeCover(record: JsonRecord): JsonRecord | null {
  const id = str(record.id)
  const ownerId = str(record.ownerId)
  const width = num(record.width, 0)
  const height = num(record.height, 0)
  if (!id || !ownerId || width < 1 || height < 1) return null

  return {
    ...record,
    id,
    ownerType: str(record.ownerType, 'book'),
    ownerId,
    mime: 'image/jpeg',
    width,
    height,
    createdAt: str(record.createdAt, new Date().toISOString()),
  }
}

/**
 * Fills defaults for fields that older backups may miss. Entities without an id
 * (and books without a title) are dropped instead of being guessed. The result
 * is still untrusted and must be validated with `backupDataSchema`.
 */
export function normalizeBackup(raw: unknown, sourceVersion = 1): Record<string, unknown> {
  const source = isRecord(raw) ? raw : {}

  return {
    books: normalizeList(source.books, (book) => normalizeBook(book, sourceVersion)),
    readings: normalizeList(source.readings, normalizeReading),
    sessions: normalizeList(source.sessions, normalizeSession),
    quotes: normalizeList(source.quotes, normalizeQuote),
    journals: normalizeList(source.journals, normalizeJournal),
    characters: normalizeList(source.characters, normalizeCharacter),
    bookNotes: normalizeList(source.bookNotes, normalizeBookNote),
    bookLinks: normalizeList(source.bookLinks, normalizeBookLink),
    goals: normalizeList(source.goals, normalizeGoal),
    settings: normalizeList(source.settings, normalizeSettings),
    tombstones: normalizeList(source.tombstones, normalizeTombstone),
    covers: normalizeList(source.covers, normalizeCover),
  }
}
