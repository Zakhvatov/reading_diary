import Dexie from 'dexie'
import { afterAll, describe, expect, it } from 'vitest'
import { ReadingDiaryDB, db } from './db'

afterAll(() => {
  db.close()
})

describe('dexie v2 to v3 migration', () => {
  it('converts rating, adds deep diary defaults and keeps reading history', async () => {
    const name = 'reading-diary-v2-v3-migration'
    const now = '2026-01-01T00:00:00.000Z'
    const legacy = new Dexie(name)

    legacy.version(1).stores({
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
    legacy.version(2).stores({
      readings: 'id, bookId, status, startedAt, finishedAt, [bookId+status]',
    })

    await legacy.open()
    await legacy.table('books').add({
      id: 'book-1',
      title: 'Книга',
      authors: [],
      genres: [],
      status: 'finished',
      progressMode: 'pages',
      currentPage: 320,
      percent: 100,
      rating: 4,
      startedAt: '2026-01-01',
      finishedAt: '2026-01-10',
      totalReadingMs: 0,
      sessionCount: 0,
      pagesReadTotal: 0,
      createdAt: now,
      updatedAt: now,
    })
    await legacy.table('readings').add({
      id: 'reading-1',
      bookId: 'book-1',
      status: 'finished',
      startedAt: '2026-01-01',
      finishedAt: '2026-01-10',
      createdAt: now,
      updatedAt: now,
    })
    await legacy.table('quotes').add({
      id: 'quote-1',
      bookId: 'book-1',
      text: 'Цитата',
      createdAt: now,
      updatedAt: now,
    })
    await legacy.table('journals').add({
      id: 'journal-1',
      title: 'Запись',
      body: '',
      color: 'pine',
      entryDate: '2026-01-01',
      createdAt: now,
      updatedAt: now,
    })
    await legacy.table('settings').add({
      id: 'app',
      onboardingDone: true,
      defaultStatus: 'want',
      defaultTemplate: 'analyst',
      dailyGoalMinutes: 0,
      persistGranted: false,
      schemaVersion: 2,
      createdAt: now,
      updatedAt: now,
    })
    legacy.close()

    const upgraded = new ReadingDiaryDB(name)

    try {
      await upgraded.open()

      expect(await upgraded.books.get('book-1')).toMatchObject({
        rating: 8,
        ratingScale: 'stars5',
        tags: [],
        moods: [],
        colorLabel: 'none',
        diaryTemplate: 'analyst',
        shareable: false,
      })
      expect(await upgraded.readings.get('reading-1')).toMatchObject({
        status: 'finished',
        startedAt: '2026-01-01',
        finishedAt: '2026-01-10',
      })
      expect(await upgraded.quotes.get('quote-1')).toMatchObject({
        favorite: false,
        shareable: false,
      })
      expect(await upgraded.journals.get('journal-1')).toMatchObject({
        tags: [],
        shareable: false,
      })
      expect(await upgraded.settings.get('app')).toMatchObject({
        schemaVersion: 3,
        defaultTemplate: 'analyst',
        defaultRatingScale: 'stars5',
      })
    } finally {
      upgraded.close()
      await Dexie.delete(name)
    }
  })
})
