export type ID = string
export type ISODateTime = string // UTC ISO
export type ISODate = string // YYYY-MM-DD, local calendar day

export type BookStatus = 'want' | 'reading' | 'finished' | 'dnf'
export type ProgressMode = 'pages' | 'percent'

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
  rating?: 1 | 2 | 3 | 4 | 5
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
  note?: string
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
  photoId?: ID
  entryDate: ISODate
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
  dailyGoalMinutes: number
  lastBackupAt?: ISODateTime
  lastSnapshotAt?: ISODateTime
  persistGranted: boolean
  schemaVersion: number
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export type EntityKind = 'book' | 'session' | 'quote' | 'journal' | 'goal'

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
