import Dexie, { type Table } from 'dexie'
import type {
  Book,
  Cover,
  Goal,
  JournalEntry,
  MetaRecord,
  Quote,
  Session,
  Settings,
  Tombstone,
} from './types'

export class ReadingDiaryDB extends Dexie {
  books!: Table<Book, string>
  sessions!: Table<Session, string>
  quotes!: Table<Quote, string>
  journals!: Table<JournalEntry, string>
  goals!: Table<Goal, string>
  covers!: Table<Cover, string>
  settings!: Table<Settings, string>
  tombstones!: Table<Tombstone, string>
  meta!: Table<MetaRecord, string>

  constructor(name = 'reading-diary') {
    super(name)
    this.version(1).stores({
      books: 'id, status, title, isbn13, createdAt, updatedAt, finishedAt, *authors, *genres',
      sessions: 'id, bookId, day, startedAt, [bookId+startedAt], [bookId+day]',
      quotes: 'id, bookId, createdAt',
      journals: 'id, bookId, entryDate, createdAt',
      goals: 'id, year',
      covers: 'id, ownerId, [ownerType+ownerId]',
      settings: 'id',
      tombstones: 'id, entity, deletedAt, [entity+entityId]',
      meta: 'key, kind, fetchedAt',
    })
  }
}

export const db = new ReadingDiaryDB()

db.on('versionchange', () => {
  db.close()
})
