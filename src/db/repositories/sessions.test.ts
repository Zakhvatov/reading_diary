import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db'
import { createBook, getBook, updateBook } from './books'
import { addSession, deleteSession, listSessionsByDay } from './sessions'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterAll(() => {
  db.close()
})

describe('sessions repository', () => {
  it('adds a session, moves progress and recalculates stats', async () => {
    const book = await createBook({ title: 'Книга', pageCount: 200 })

    const session = await addSession({
      bookId: book.id,
      startedAt: '2026-02-01T10:00:00.000Z',
      durationMs: 45 * 60_000,
      pagesRead: 20,
      startPage: 1,
      endPage: 20,
    })

    const updated = await getBook(book.id)
    expect(updated).toMatchObject({
      status: 'reading',
      currentPage: 20,
      totalReadingMs: 45 * 60_000,
      sessionCount: 1,
      pagesReadTotal: 20,
    })
    expect(session.day).toBe('2026-02-01')
    expect(await listSessionsByDay('2026-02-01')).toHaveLength(1)
  })

  it('finishes the book when the last page is reached', async () => {
    const book = await createBook({ title: 'Книга', pageCount: 100, status: 'reading' })

    await addSession({
      bookId: book.id,
      startedAt: '2026-02-02T10:00:00.000Z',
      durationMs: 60 * 60_000,
      endPage: 100,
    })

    expect(await getBook(book.id)).toMatchObject({
      status: 'finished',
      currentPage: 100,
      percent: 100,
      finishedAt: '2026-02-02',
    })
  })

  it('recalculates stats after deleting a session but keeps progress', async () => {
    const book = await createBook({ title: 'Книга', pageCount: 200 })
    const session = await addSession({
      bookId: book.id,
      startedAt: '2026-02-03T10:00:00.000Z',
      durationMs: 10 * 60_000,
      pagesRead: 5,
      endPage: 5,
    })

    await deleteSession(session.id)

    expect(await getBook(book.id)).toMatchObject({
      currentPage: 5,
      totalReadingMs: 0,
      sessionCount: 0,
      pagesReadTotal: 0,
    })
  })

  it('rejects a zero-length session', async () => {
    const book = await createBook({ title: 'Книга' })

    await expect(
      addSession({
        bookId: book.id,
        startedAt: '2026-02-04T10:00:00.000Z',
        durationMs: 0,
      }),
    ).rejects.toThrow('Длительность')
  })

  it('keeps a manual end page when provided', async () => {
    const book = await createBook({ title: 'Книга', pageCount: 50 })
    await updateBook(book.id, { status: 'reading' })

    const session = await addSession({
      bookId: book.id,
      startedAt: '2026-02-05T10:00:00.000Z',
      durationMs: 5 * 60_000,
      endPage: 12,
      note: 'В метро',
    })

    expect(session.endPage).toBe(12)
    expect(session.note).toBe('В метро')
  })
})
