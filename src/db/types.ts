import type { BoardNote } from '@/lib/board'
import type { DiaryTemplateId } from '@/lib/templates'

export type { BoardNote, BoardNoteColor } from '@/lib/board'
export type { DiaryTemplateId } from '@/lib/templates'

export type ID = string
export type ISODateTime = string // UTC ISO
export type ISODate = string // YYYY-MM-DD, local calendar day

import type { ThemeId, ThemeMode } from '@/lib/theme'

export type BookStatus = 'want' | 'reading' | 'finished' | 'dnf' | 'rereading'
export type ProgressMode = 'pages' | 'percent'
export type RatingScale = 'stars5' | 'score10' | 'emotion'
export type EmotionRating = 'love' | 'neutral' | 'mindblown'
export type BookFormat = 'paper' | 'ebook' | 'audio'
export type Acquisition = 'bought' | 'library' | 'gift' | 'other'
export type ColorLabel = 'red' | 'amber' | 'green' | 'blue' | 'none'

export interface Book {
  id: ID
  title: string
  subtitle?: string
  authors: string[]
  isbn13?: string
  isbn10?: string
  publisher?: string
  publishedYear?: number
  pageCount?: number
  language?: string
  genres: string[]
  description?: string
  status: BookStatus
  progressMode: ProgressMode
  currentPage: number
  percent: number
  /** Каноническая оценка 0…10, независимо от шкалы ввода. */
  rating?: number
  ratingScale: RatingScale
  emotion?: EmotionRating
  tags: string[]
  moods: string[]
  format?: BookFormat
  acquisition?: Acquisition
  colorLabel: ColorLabel
  diaryTemplate: DiaryTemplateId
  shareable: boolean
  startedAt?: ISODate
  finishedAt?: ISODate
  coverId?: ID
  totalReadingMs: number
  sessionCount: number
  pagesReadTotal: number
  metadataSource?: 'openlibrary' | 'googlebooks' | 'manual'
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export type ReadingStatus = 'reading' | 'finished' | 'dnf'

/** Одна попытка прочтения книги. Перечитывание — новая запись. */
export interface Reading {
  id: ID
  bookId: ID
  status: ReadingStatus
  startedAt?: ISODate
  /** Дата завершения попытки: прочитано или брошено. */
  finishedAt?: ISODate
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export type SessionKind = 'timer' | 'manual'

export interface Session {
  id: ID
  bookId: ID
  day: ISODate
  startedAt: ISODateTime
  endedAt: ISODateTime
  durationMs: number
  pagesRead: number
  startPage?: number
  endPage?: number
  kind: SessionKind
  note?: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface Quote {
  id: ID
  bookId: ID
  text: string
  page?: number
  chapter?: string
  note?: string
  favorite: boolean
  shareable: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export type JournalColor = 'pine' | 'amber' | 'clay' | 'sky' | 'plum' | 'moss'

export interface JournalEntry {
  id: ID
  bookId?: ID
  title: string
  body: string
  color: JournalColor
  /** Фотографии записи: до шести, порядок задаёт галерею. */
  photoIds: ID[]
  /** Заметки на доске записи: порядок массива — порядок наложения. */
  board: BoardNote[]
  entryDate: ISODate
  tags: string[]
  mood?: string
  shareable: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface Character {
  id: ID
  bookId: ID
  name: string
  role?: string
  note: string
  spoiler?: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export type BookNoteKind = 'plot' | 'insight'

export interface BookNote {
  id: ID
  bookId: ID
  kind: BookNoteKind
  title?: string
  chapter?: string
  body: string
  tags: string[]
  order: number
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export type BookLinkKind = 'similar' | 'sequel' | 'prequel' | 'same-world' | 'other'

export interface BookLink {
  id: ID
  bookId: ID
  targetBookId?: ID
  targetTitle: string
  kind: BookLinkKind
  note?: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface Goal {
  id: ID
  year: number
  targetBooks: number
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface Settings {
  id: 'app'
  onboardingDone: boolean
  defaultStatus: BookStatus
  defaultTemplate: DiaryTemplateId
  defaultRatingScale: RatingScale
  dailyGoalMinutes: number
  theme: ThemeId
  themeMode: ThemeMode
  lastBackupAt?: ISODateTime
  lastSnapshotAt?: ISODateTime
  persistGranted: boolean
  schemaVersion: number
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export type EntityKind =
  | 'book'
  | 'reading'
  | 'session'
  | 'quote'
  | 'journal'
  | 'goal'
  | 'character'
  | 'bookNote'
  | 'bookLink'

export interface Tombstone {
  id: ID
  entity: EntityKind
  entityId: ID
  deletedAt: ISODateTime
}

export interface Cover {
  id: ID
  ownerType: 'book' | 'journal'
  ownerId: ID
  blob: Blob
  mime: 'image/jpeg'
  width: number
  height: number
  sourceUrl?: string
  createdAt: ISODateTime
}

export interface MetaRecord {
  key: string
  kind: 'isbn' | 'search' | 'cover'
  payload: unknown
  fetchedAt: ISODateTime
  ttlDays: number
}
