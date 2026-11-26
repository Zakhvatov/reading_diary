import { describe, expect, it } from 'vitest'
import type { Book } from '@/db/types'
import { applySessionProgress, bookProgress, finishBook, setBookStatus } from './progress'

function book(overrides: Partial<Book> = {}): Book {
  return {
    id: 'book-1',
    title: 'Тест',
    authors: [],
    genres: [],
    status: 'want',
    progressMode: 'pages',
    currentPage: 0,
    percent: 0,
    totalReadingMs: 0,
    sessionCount: 0,
    pagesReadTotal: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('bookProgress', () => {
  it('uses pages when page count is known', () => {
    expect(bookProgress(book({ currentPage: 50, pageCount: 200 }))).toBe(0.25)
  })

  it('returns zero without page count', () => {
    expect(bookProgress(book({ currentPage: 50 }))).toBe(0)
  })

  it('clamps pages and percent', () => {
    expect(bookProgress(book({ currentPage: 300, pageCount: 200 }))).toBe(1)
    expect(bookProgress(book({ progressMode: 'percent', percent: 140 }))).toBe(1)
  })
})

describe('applySessionProgress', () => {
  it('moves progress forward and starts a wanted book', () => {
    const patch = applySessionProgress(book({ pageCount: 200 }), { endPage: 40, day: '2026-02-01' })

    expect(patch.currentPage).toBe(40)
    expect(patch.status).toBe('reading')
    expect(patch.startedAt).toBe('2026-02-01')
  })

  it('ignores a session that does not move forward', () => {
    expect(
      applySessionProgress(book({ currentPage: 60, pageCount: 200 }), {
        endPage: 40,
        day: '2026-02-01',
      }),
    ).toEqual({})
  })

  it('clamps to page count and finishes the book', () => {
    const patch = applySessionProgress(book({ status: 'reading', pageCount: 200 }), {
      endPage: 500,
      day: '2026-02-02',
    })

    expect(patch.currentPage).toBe(200)
    expect(patch.status).toBe('finished')
    expect(patch.finishedAt).toBe('2026-02-02')
    expect(patch.percent).toBe(100)
  })
})

describe('status changes', () => {
  it('finishes a book with known page count', () => {
    expect(finishBook(book({ pageCount: 320 }), '2026-03-01')).toMatchObject({
      status: 'finished',
      currentPage: 320,
      percent: 100,
      finishedAt: '2026-03-01',
    })
  })

  it('keeps progress when moving back to reading', () => {
    const finished = book({ status: 'finished', finishedAt: '2026-03-01', currentPage: 120 })

    expect(setBookStatus(finished, 'reading', '2026-03-02')).toEqual({
      status: 'reading',
      startedAt: '2026-03-02',
      finishedAt: undefined,
    })
  })
})
