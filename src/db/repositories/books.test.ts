import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db'
import { createBookLink } from './bookLinks'
import { createBookNote } from './bookNotes'
import { addSession } from './sessions'
import { createCharacter } from './characters'
import { createBook, deleteBook, findSimilarBook, getBook, listBooks, updateBook } from './books'
import { createQuote } from './quotes'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterAll(() => {
  db.close()
})

describe('books repository', () => {
  it('creates a book with defaults', async () => {
    const book = await createBook({ title: '  Тихий Дон  ', authors: ['Шолохов'] })

    expect(book.title).toBe('Тихий Дон')
    expect(book.status).toBe('want')
    expect(book.progressMode).toBe('pages')
    expect(book.authors).toEqual(['Шолохов'])
    expect(book.totalReadingMs).toBe(0)
    expect(await getBook(book.id)).toEqual(book)
  })

  it('updates fields and keeps id', async () => {
    const book = await createBook({ title: 'Книга' })
    await updateBook(book.id, { status: 'reading', currentPage: 12 })

    const updated = await getBook(book.id)
    expect(updated?.id).toBe(book.id)
    expect(updated?.status).toBe('reading')
    expect(updated?.currentPage).toBe(12)
  })

  it('lists books by status, newest first', async () => {
    const first = await createBook({ title: 'Первая', status: 'reading' })
    const second = await createBook({ title: 'Вторая', status: 'reading' })
    await createBook({ title: 'Третья', status: 'finished' })
    await updateBook(first.id, { currentPage: 1 })

    const reading = await listBooks('reading')
    expect(reading.map((book) => book.id)).toEqual([first.id, second.id])
  })

  it('finds a similar book by ISBN or title and author', async () => {
    const book = await createBook({
      title: 'Мастер и Маргарита',
      authors: ['Михаил Булгаков'],
      isbn13: '9785170902583',
    })

    expect(await findSimilarBook({ isbn13: '9785170902583', title: 'Другое' })).toEqual(book)
    expect(
      await findSimilarBook({ title: '  мастер и маргарита! ', authors: ['михаил булгаков'] }),
    ).toEqual(book)
  })

  it('cascades sessions and writes tombstones on delete', async () => {
    const book = await createBook({ title: 'Книга', pageCount: 100 })
    await addSession({
      bookId: book.id,
      startedAt: '2026-02-01T10:00:00.000Z',
      durationMs: 30 * 60_000,
      endPage: 20,
    })

    await deleteBook(book.id)

    expect(await getBook(book.id)).toBeUndefined()
    expect(await db.sessions.where('bookId').equals(book.id).count()).toBe(0)
    expect(await db.tombstones.where('entity').equals('book').count()).toBe(1)
    expect(await db.tombstones.where('entity').equals('session').count()).toBe(1)
  })

  it('cascades deep diary tables and writes tombstones on delete', async () => {
    const book = await createBook({ title: 'Книга' })
    await createCharacter({ bookId: book.id, name: 'Герой' })
    await createBookNote({ bookId: book.id, kind: 'insight', body: 'Мысль' })
    await createBookLink({ bookId: book.id, targetTitle: 'Другая', kind: 'sequel' })
    await createQuote({ bookId: book.id, text: 'Цитата' })

    await deleteBook(book.id)

    expect(await db.characters.count()).toBe(0)
    expect(await db.bookNotes.count()).toBe(0)
    expect(await db.bookLinks.count()).toBe(0)
    expect(await db.quotes.count()).toBe(0)

    for (const entity of ['character', 'bookNote', 'bookLink', 'quote'] as const) {
      expect(await db.tombstones.where('entity').equals(entity).count()).toBe(1)
    }
  })
})
