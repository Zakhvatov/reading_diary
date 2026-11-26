import { describe, expect, it } from 'vitest'
import type { Session } from '../types'
import * as calendar from './calendar'

function makeSession(
  id: string,
  bookId: string,
  day: string,
  minutes: number,
  pages: number,
): Session {
  return {
    id,
    bookId,
    day,
    startedAt: `${day}T10:00:00.000Z`,
    endedAt: `${day}T11:00:00.000Z`,
    durationMs: minutes * 60_000,
    pagesRead: pages,
    kind: 'manual',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('summarizeCalendar', () => {
  it('merges sessions of one day and ignores other months', () => {
    const month = calendar.summarizeCalendar(
      [
        makeSession('1', 'a', '2026-11-05', 30, 20),
        makeSession('2', 'b', '2026-11-05', 15, 5),
        makeSession('3', 'a', '2026-11-06', 10, 10),
        makeSession('4', 'a', '2026-12-01', 40, 40),
      ],
      { start: '2026-11-01', end: '2026-11-30' },
    )

    expect(month.days.size).toBe(2)
    expect(month.days.get('2026-11-05')).toEqual({
      day: '2026-11-05',
      minutes: 45,
      pages: 25,
      bookIds: ['a', 'b'],
    })
    expect(month.days.get('2026-11-06')?.minutes).toBe(10)
    expect(month.days.has('2026-12-01')).toBe(false)
  })
})

describe('month helpers', () => {
  it('normalizes, shifts and labels a month', () => {
    expect(calendar.normalizeMonth('2026-11', '2026-05-10')).toBe('2026-11')
    expect(calendar.normalizeMonth('2026-13', '2026-05-10')).toBe('2026-05')
    expect(calendar.normalizeMonth(null, '2026-05-10')).toBe('2026-05')

    expect(calendar.shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(calendar.shiftMonth('2026-12', 1)).toBe('2027-01')

    expect(calendar.monthAnchor('2026-11')).toBe('2026-11-01')
    expect(calendar.monthLabel('2026-11')).toBe('Ноябрь 2026')
  })
})
