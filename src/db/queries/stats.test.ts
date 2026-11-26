import { describe, expect, it } from 'vitest'
import type { Book, Session } from '../types'
import { summarizeSessions, toWeeklySeries } from './stats'

function makeBook(id: string, title: string, genres: string[], format?: string): Book {
  return {
    id,
    title,
    authors: ['Автор'],
    genres,
    status: 'reading',
    progressMode: 'pages',
    currentPage: 0,
    percent: 0,
    totalReadingMs: 0,
    sessionCount: 0,
    pagesReadTotal: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...(format ? { format } : {}),
  } as Book
}

function makeSession(
  id: string,
  bookId: string,
  day: string,
  minutes: number,
  pagesRead: number,
): Session {
  return {
    id,
    bookId,
    day,
    startedAt: `${day}T10:00:00.000Z`,
    endedAt: `${day}T11:00:00.000Z`,
    durationMs: minutes * 60_000,
    pagesRead,
    kind: 'manual',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

const range = { start: '2026-01-01', end: '2026-12-31' }

const books = [
  makeBook('a', 'Альфа', ['роман'], 'paper'),
  makeBook('b', 'Бета', ['роман', 'история'], 'ebook'),
  makeBook('c', 'Гамма', []),
]

const sessions = [
  makeSession('old', 'a', '2025-12-31', 60, 30),
  makeSession('a1', 'a', '2026-01-01', 60, 30),
  makeSession('b1', 'b', '2026-01-01', 30, 10),
  makeSession('c1', 'c', '2026-01-01', 15, 5),
  makeSession('a2', 'a', '2026-01-03', 90, 45),
]

describe('summarizeSessions', () => {
  it('sums the range and ignores sessions outside it', () => {
    const summary = summarizeSessions(sessions, books, range)

    expect(summary).toMatchObject({
      minutes: 195,
      pages: 90,
      sessions: 4,
      books: 3,
    })
    expect(summary.start).toBe('2026-01-01')
    expect(summary.end).toBe('2026-12-31')
  })

  it('fills a day series across the whole range', () => {
    const summary = summarizeSessions(sessions, books, range)

    expect(summary.series).toHaveLength(365)
    expect(summary.series[0]).toEqual({ day: '2026-01-01', minutes: 105, pages: 45, sessions: 3 })
    expect(summary.series[1]).toEqual({ day: '2026-01-02', minutes: 0, pages: 0, sessions: 0 })
    expect(summary.series[2]).toEqual({ day: '2026-01-03', minutes: 90, pages: 45, sessions: 1 })
  })

  it('breaks down by book, genre and optional format', () => {
    const summary = summarizeSessions(sessions, books, range)

    expect(summary.byBook.map((row) => [row.label, row.minutes])).toEqual([
      ['Альфа', 150],
      ['Бета', 30],
      ['Гамма', 15],
    ])
    expect(summary.byBook[0]?.share).toBeCloseTo(150 / 195)

    expect(summary.byGenre.map((row) => [row.label, row.minutes, row.share])).toEqual([
      ['роман', 180, 180 / 210],
      ['история', 30, 30 / 210],
    ])
    expect(summary.byFormat.map((row) => [row.label, row.minutes])).toEqual([
      ['Бумага', 150],
      ['Электронная', 30],
    ])
  })

  it('omits format breakdown when no book has a format', () => {
    const summary = summarizeSessions(
      sessions,
      books.map((book) => ({ ...book, format: undefined })),
      range,
    )

    expect(summary.byFormat).toEqual([])
  })
})

describe('toWeeklySeries', () => {
  it('groups days into Monday-first weeks', () => {
    const weekly = toWeeklySeries([
      { day: '2026-01-01', minutes: 10, pages: 1, sessions: 1 },
      { day: '2026-01-04', minutes: 20, pages: 2, sessions: 1 },
      { day: '2026-01-05', minutes: 5, pages: 3, sessions: 1 },
    ])

    expect(weekly).toEqual([
      { day: '2025-12-29', minutes: 30, pages: 3, sessions: 2 },
      { day: '2026-01-05', minutes: 5, pages: 3, sessions: 1 },
    ])
  })
})
