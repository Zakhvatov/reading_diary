import Dexie, { type Table } from 'dexie'
import { toBoardNotes } from '@/lib/board'
import type { DiaryTemplateId } from '@/lib/templates'
import type {
  Book,
  BookLink,
  BookNote,
  Character,
  Cover,
  Goal,
  JournalEntry,
  MetaRecord,
  Quote,
  Reading,
  RatingScale,
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
  characters!: Table<Character, string>
  bookNotes!: Table<BookNote, string>
  bookLinks!: Table<BookLink, string>
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

    this.version(3)
      .stores({
        books:
          'id, status, title, isbn13, createdAt, updatedAt, finishedAt, colorLabel, ' +
          '*authors, *genres, *tags, *moods',
        quotes: 'id, bookId, createdAt, favorite',
        journals: 'id, bookId, entryDate, createdAt, *tags',
        characters: 'id, bookId, createdAt',
        bookNotes: 'id, bookId, kind, [bookId+kind+order], *tags, createdAt',
        bookLinks: 'id, bookId, targetBookId, kind, createdAt',
      })
      .upgrade(async (transaction) => {
        const settingsTable = transaction.table('settings')
        const settings = (await settingsTable.get('app')) as Partial<Settings> | undefined
        const template: DiaryTemplateId =
          settings?.defaultTemplate === 'analyst' || settings?.defaultTemplate === 'bookclub'
            ? settings.defaultTemplate
            : 'lite'

        await transaction
          .table('books')
          .toCollection()
          .modify((book: Partial<Book>) => {
            if (book.ratingScale === undefined) {
              if (typeof book.rating === 'number' && book.rating <= 5) book.rating *= 2
              book.ratingScale = 'stars5'
            }
            book.tags ??= []
            book.moods ??= []
            book.colorLabel ??= 'none'
            book.diaryTemplate ??= template
            book.shareable ??= false
          })

        await transaction
          .table('quotes')
          .toCollection()
          .modify((quote: Partial<Quote>) => {
            quote.favorite ??= false
            quote.shareable ??= false
          })

        await transaction
          .table('journals')
          .toCollection()
          .modify((entry: Partial<JournalEntry>) => {
            entry.tags ??= []
            entry.shareable ??= false
          })

        if (settings) {
          await settingsTable.update('app', {
            schemaVersion: 3,
            defaultTemplate: template,
            defaultRatingScale: (settings.defaultRatingScale ?? 'stars5') as RatingScale,
          })
        }
      })

    this.version(4)
      .stores({
        journals: 'id, bookId, entryDate, createdAt, *tags',
      })
      .upgrade(async (transaction) => {
        await transaction
          .table('journals')
          .toCollection()
          .modify((entry: Partial<JournalEntry> & { photoId?: string; stickers?: unknown }) => {
            entry.photoIds ??= entry.photoId ? [entry.photoId] : []
            entry.stickers ??= []
            delete entry.photoId
          })

        const settingsTable = transaction.table('settings')
        if (await settingsTable.get('app')) {
          await settingsTable.update('app', { schemaVersion: 4 })
        }
      })

    this.version(5)
      .stores({
        journals: 'id, bookId, entryDate, createdAt, *tags',
      })
      .upgrade(async (transaction) => {
        await transaction
          .table('journals')
          .toCollection()
          .modify((entry: Partial<JournalEntry> & { stickers?: unknown }) => {
            entry.stickers ??= []
          })

        const settingsTable = transaction.table('settings')
        if (await settingsTable.get('app')) {
          await settingsTable.update('app', { schemaVersion: 5 })
        }
      })

    this.version(6)
      .stores({
        journals: 'id, bookId, entryDate, createdAt, *tags',
      })
      .upgrade(async (transaction) => {
        await transaction
          .table('journals')
          .toCollection()
          .modify(
            (
              entry: Partial<JournalEntry> & {
                stickers?: unknown
                board?: unknown
              },
            ) => {
              entry.board = toBoardNotes(entry.board ?? entry.stickers)
              delete entry.stickers
            },
          )

        const settingsTable = transaction.table('settings')
        if (await settingsTable.get('app')) {
          await settingsTable.update('app', { schemaVersion: 6 })
        }
      })

    // «Лавандовое поле» становится темой по умолчанию: один раз переводим
    // сохранённый выбор на неё, дальше пользователь меняет тему сам.
    this.version(7)
      .stores({
        settings: 'id',
      })
      .upgrade(async (transaction) => {
        const settingsTable = transaction.table('settings')
        if (await settingsTable.get('app')) {
          await settingsTable.update('app', { theme: 'lavender' })
        }
      })
  }
}

export const db = new ReadingDiaryDB()

db.on('versionchange', () => {
  db.close()
})
