import Dexie, { type Table } from 'dexie'
import type {
  Book,
  Cover,
  Goal,
  JournalEntry,
  MetaRecord,
  Quote,
  Reading,
  Session,
  Settings,
  Tombstone,
} from './types'

export class ReadingDiaryDB extends Dexie {
  books!: Table<Book, string>
  readings!: Table<Reading, string>
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

    this.version(2)
      .stores({
        readings: 'id, bookId, status, startedAt, finishedAt, [bookId+status]',
      })
      .upgrade(async (transaction) => {
        const books = (await transaction.table('books').toArray()) as Book[]
        const rows: Reading[] = []

        for (const book of books) {
          if (book.status === 'want') continue

          const reading: Reading = {
            id: crypto.randomUUID(),
            bookId: book.id,
            status:
              book.status === 'finished' ? 'finished' : book.status === 'dnf' ? 'dnf' : 'reading',
            createdAt: book.createdAt,
            updatedAt: book.createdAt,
          }

          if (book.startedAt) reading.startedAt = book.startedAt
          if (book.finishedAt) reading.finishedAt = book.finishedAt
          rows.push(reading)
        }

        if (rows.length > 0) {
          await transaction.table('readings').bulkAdd(rows)
        }

        const settingsTable = transaction.table('settings')
        if (await settingsTable.get('app')) {
          await settingsTable.update('app', { schemaVersion: 2 })
        }
      })
  }
}

export const db = new ReadingDiaryDB()

db.on('versionchange', () => {
  db.close()
})
