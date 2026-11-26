import Dexie from 'dexie'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { today } from '@/lib/dates'
import { ReadingDiaryDB, db } from '../db'
import { addSession } from './sessions'
import { createBook, deleteBook, updateBook } from './books'
import { listReadings } from './readings'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterAll(() => {
  db.close()
})

describe('readings repository', () => {
  it('starts a reading when the book moves to reading', async () => {
    const book = await createBook({ title: 'Книга' })

    await updateBook(book.id, { status: 'reading' })

    const [reading] = await listReadings(book.id)
    expect(reading).toMatchObject({ status: 'reading', startedAt: today() })
    expect(reading?.finishedAt).toBeUndefined()
  })

  it('does not duplicate the open reading', async () => {
    const book = await createBook({ title: 'Книга', status: 'reading' })

    await updateBook(book.id, { status: 'reading', currentPage: 10 })

    expect(await listReadings(book.id)).toHaveLength(1)
  })

  it('closes the open reading when the book is finished', async () => {
    const book = await createBook({ title: 'Книга' })
    await updateBook(book.id, { status: 'reading' })

    await updateBook(book.id, { status: 'finished' })

    const [reading] = await listReadings(book.id)
    expect(reading).toMatchObject({
      status: 'finished',
      startedAt: today(),
      finishedAt: today(),
    })
  })

  it('marks the open reading as abandoned', async () => {
    const book = await createBook({ title: 'Книга' })
    await updateBook(book.id, { status: 'reading' })

    await updateBook(book.id, { status: 'dnf' })

    const [reading] = await listReadings(book.id)
    expect(reading).toMatchObject({ status: 'dnf', finishedAt: today() })
  })

  it('adds a second reading when a finished book is reread', async () => {
    const book = await createBook({ title: 'Книга' })
    await updateBook(book.id, { status: 'reading' })
    await updateBook(book.id, { status: 'finished' })

    await updateBook(book.id, { status: 'reading' })

    const readings = await listReadings(book.id)
    expect(readings).toHaveLength(2)
    expect(readings[0]).toMatchObject({ status: 'finished', finishedAt: today() })
    expect(readings[1]).toMatchObject({ status: 'reading', startedAt: today() })
    expect(readings[1]?.finishedAt).toBeUndefined()
  })

  it('opens a new reading when the book moves to rereading', async () => {
    const book = await createBook({ title: 'Книга' })
    await updateBook(book.id, { status: 'reading' })
    await updateBook(book.id, { status: 'finished' })

    await updateBook(book.id, { status: 'rereading' })

    const readings = await listReadings(book.id)
    expect(readings).toHaveLength(2)
    expect(readings[0]).toMatchObject({ status: 'finished' })
    expect(readings[1]).toMatchObject({ status: 'reading', startedAt: today() })
    expect(readings[1]?.finishedAt).toBeUndefined()
  })

  it('starts a reading when the first session moves a planned book to reading', async () => {
    const book = await createBook({ title: 'Книга', pageCount: 200 })

    await addSession({
      bookId: book.id,
      startedAt: '2026-02-01T10:00:00.000Z',
      durationMs: 30 * 60_000,
      endPage: 20,
    })

    const [reading] = await listReadings(book.id)
    expect(reading).toMatchObject({ status: 'reading', startedAt: '2026-02-01' })
  })

  it('closes the reading when a session reaches the last page', async () => {
    const book = await createBook({ title: 'Книга', pageCount: 100, status: 'reading' })

    await addSession({
      bookId: book.id,
      startedAt: '2026-02-02T10:00:00.000Z',
      durationMs: 60 * 60_000,
      endPage: 100,
    })

    const [reading] = await listReadings(book.id)
    expect(reading).toMatchObject({ status: 'finished', finishedAt: '2026-02-02' })
  })

  it('removes only the open reading when the book returns to planned', async () => {
    const book = await createBook({ title: 'Книга' })
    await updateBook(book.id, { status: 'reading' })
    await updateBook(book.id, { status: 'finished' })
    await updateBook(book.id, { status: 'reading' })

    await updateBook(book.id, { status: 'want' })

    const readings = await listReadings(book.id)
    expect(readings).toHaveLength(1)
    expect(readings[0]?.status).toBe('finished')
  })

  it('creates a finished reading for a book added as read', async () => {
    const book = await createBook({
      title: 'Книга',
      status: 'finished',
      startedAt: '2025-12-01',
      finishedAt: '2026-01-10',
    })

    const [reading] = await listReadings(book.id)
    expect(reading).toMatchObject({
      status: 'finished',
      startedAt: '2025-12-01',
      finishedAt: '2026-01-10',
    })
  })

  it('deletes readings with the book and writes a tombstone', async () => {
    const book = await createBook({ title: 'Книга', status: 'reading' })
    const [reading] = await listReadings(book.id)

    await deleteBook(book.id)

    expect(await db.readings.count()).toBe(0)
    expect(await db.tombstones.where('entity').equals('reading').count()).toBe(1)
    expect((await db.tombstones.where('entity').equals('reading').first())?.entityId).toBe(
      reading?.id,
    )
  })
})

describe('readings migration', () => {
  it('creates readings for books that were already reading or finished', async () => {
    const name = 'reading-diary-migration'
    const legacy = new Dexie(name)
    legacy.version(1).stores({ books: 'id, status' })

    await legacy.open()
    await legacy.table('books').bulkAdd([
      {
        id: 'reading-book',
        title: 'Читаю',
        status: 'reading',
        startedAt: '2026-01-05',
        createdAt: '2026-01-05T10:00:00.000Z',
      },
      {
        id: 'finished-book',
        title: 'Прочитано',
        status: 'finished',
        startedAt: '2025-12-01',
        finishedAt: '2026-01-02',
        createdAt: '2025-12-01T10:00:00.000Z',
      },
      {
        id: 'planned-book',
        title: 'В планах',
        status: 'want',
        createdAt: '2026-01-06T10:00:00.000Z',
      },
    ])
    legacy.close()

    const upgraded = new ReadingDiaryDB(name)
    await upgraded.open()

    try {
      const readings = await upgraded.readings.toArray()
      expect(readings).toHaveLength(2)
      expect(readings.find((reading) => reading.bookId === 'reading-book')).toMatchObject({
        status: 'reading',
        startedAt: '2026-01-05',
      })
      expect(readings.find((reading) => reading.bookId === 'finished-book')).toMatchObject({
        status: 'finished',
        startedAt: '2025-12-01',
        finishedAt: '2026-01-02',
      })
    } finally {
      upgraded.close()
      await Dexie.delete(name)
    }
  })
})
