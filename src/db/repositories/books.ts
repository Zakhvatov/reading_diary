import { nowISO } from '@/lib/id'
import { today } from '@/lib/dates'
import { normalizeText } from '@/lib/text'
import { db } from '../db'
import type { Book, BookStatus, EntityKind, ID } from '../types'
import { applyBookStatusChange, finishReading, startReading } from './readings'

export type BookInput = {
  title: string
  authors?: string[]
  subtitle?: string
  isbn13?: string
  isbn10?: string
  publisher?: string
  publishedYear?: number
  pageCount?: number
  language?: string
  genres?: string[]
  description?: string
  status?: BookStatus
  progressMode?: Book['progressMode']
  currentPage?: number
  percent?: number
  rating?: Book['rating']
  startedAt?: string
  finishedAt?: string
  coverId?: ID
  metadataSource?: Book['metadataSource']
}

export async function createBook(input: BookInput): Promise<Book> {
  const now = nowISO()
  const book: Book = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    authors: input.authors ?? [],
    genres: input.genres ?? [],
    status: input.status ?? 'want',
    progressMode: input.progressMode ?? 'pages',
    currentPage: input.currentPage ?? 0,
    percent: input.percent ?? 0,
    totalReadingMs: 0,
    sessionCount: 0,
    pagesReadTotal: 0,
    createdAt: now,
    updatedAt: now,
  }

  if (input.subtitle) book.subtitle = input.subtitle
  if (input.isbn13) book.isbn13 = input.isbn13
  if (input.isbn10) book.isbn10 = input.isbn10
  if (input.publisher) book.publisher = input.publisher
  if (input.publishedYear !== undefined) book.publishedYear = input.publishedYear
  if (input.pageCount !== undefined) book.pageCount = input.pageCount
  if (input.language) book.language = input.language
  if (input.description) book.description = input.description
  if (input.rating !== undefined) book.rating = input.rating
  if (input.startedAt) book.startedAt = input.startedAt
  if (input.finishedAt) book.finishedAt = input.finishedAt
  if (input.coverId) book.coverId = input.coverId
  if (input.metadataSource) book.metadataSource = input.metadataSource

  await db.transaction('rw', [db.books, db.readings], async () => {
    await db.books.add(book)

    if (book.status === 'reading') {
      await startReading(book.id, book.startedAt ?? today())
    } else if (book.status === 'finished') {
      await finishReading(book.id, book.finishedAt ?? today(), book.startedAt)
    }
  })

  return book
}

export async function getBook(id: ID): Promise<Book | undefined> {
  return db.books.get(id)
}

export async function listBooks(status?: BookStatus): Promise<Book[]> {
  const books = status
    ? await db.books.where('status').equals(status).toArray()
    : await db.books.toArray()

  return books.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function updateBook(id: ID, patch: Partial<Book>): Promise<void> {
  const next: Partial<Book> = { ...patch, updatedAt: nowISO() }
  delete next.id
  delete next.createdAt

  await db.transaction('rw', [db.books, db.readings], async () => {
    const current = await db.books.get(id)
    await db.books.update(id, next)

    if (current && patch.status && patch.status !== current.status) {
      await applyBookStatusChange({
        bookId: id,
        from: current.status,
        to: patch.status,
        finishedAt: patch.finishedAt,
      })
    }
  })
}

export async function deleteBook(id: ID): Promise<void> {
  const deletedAt = nowISO()

  await db.transaction(
    'rw',
    [db.books, db.readings, db.sessions, db.quotes, db.journals, db.covers, db.tombstones],
    async () => {
      const readingIds = await db.readings.where('bookId').equals(id).primaryKeys()
      const sessionIds = await db.sessions.where('bookId').equals(id).primaryKeys()
      const quoteIds = await db.quotes.where('bookId').equals(id).primaryKeys()
      const journalIds = await db.journals.where('bookId').equals(id).primaryKeys()

      await db.readings.bulkDelete(readingIds)
      await db.sessions.bulkDelete(sessionIds)
      await db.quotes.bulkDelete(quoteIds)
      await db.journals.bulkDelete(journalIds)
      await db.covers.where('ownerId').equals(id).delete()

      const tombstones = [
        { entity: 'book' as EntityKind, entityId: id },
        ...readingIds.map((entityId) => ({ entity: 'reading' as EntityKind, entityId })),
        ...sessionIds.map((entityId) => ({ entity: 'session' as EntityKind, entityId })),
        ...quoteIds.map((entityId) => ({ entity: 'quote' as EntityKind, entityId })),
        ...journalIds.map((entityId) => ({ entity: 'journal' as EntityKind, entityId })),
      ].map((entry) => ({ ...entry, id: crypto.randomUUID(), deletedAt }))

      await db.tombstones.bulkAdd(tombstones)
      await db.books.delete(id)
    },
  )
}

export async function findSimilarBook(input: {
  isbn13?: string
  title: string
  authors?: string[]
}): Promise<Book | undefined> {
  if (input.isbn13) {
    const sameIsbn = await db.books.where('isbn13').equals(input.isbn13).first()
    if (sameIsbn) return sameIsbn
  }

  const title = normalizeText(input.title)
  const author = normalizeText(input.authors?.[0] ?? '')

  if (!title) return undefined

  const books = await db.books.toArray()
  return books.find(
    (book) =>
      normalizeText(book.title) === title &&
      (!author || normalizeText(book.authors[0] ?? '') === author),
  )
}
