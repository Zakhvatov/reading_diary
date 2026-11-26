import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db'
import { addSession } from './sessions'
import { createBook, deleteBook, findSimilarBook, getBook, listBooks, updateBook } from './books'

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
})
