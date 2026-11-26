import { describe, expect, it } from 'vitest'
import { computeStreak, isStreakSession } from './streak'

const REFERENCE = '2026-11-26'

function lastSevenDays(info: ReturnType<typeof computeStreak>): string[] {
  return info.last7.map((day) => day.day)
}

describe('computeStreak', () => {
  it('returns an empty streak without sessions', () => {
    const info = computeStreak([], REFERENCE)

    expect(info).toMatchObject({ current: 0, longest: 0, extendedToday: false })
    expect(info.last7).toHaveLength(7)
    expect(info.last7.every((day) => !day.active)).toBe(true)
    expect(lastSevenDays(info)).toEqual([
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
      '2026-11-23',
      '2026-11-24',
      '2026-11-25',
      '2026-11-26',
    ])
  })

  it('counts three days in a row ending today', () => {
    const info = computeStreak(['2026-11-24', '2026-11-25', '2026-11-26'], REFERENCE)

    expect(info).toMatchObject({ current: 3, longest: 3, extendedToday: true })
  })

  it('breaks the current streak on a hole yesterday', () => {
    const info = computeStreak(['2026-11-23', '2026-11-24', '2026-11-26'], REFERENCE)

    expect(info).toMatchObject({ current: 1, longest: 2, extendedToday: true })
  })

  it('keeps a streak alive when today is empty but yesterday is not', () => {
    const info = computeStreak(['2026-11-24', '2026-11-25'], REFERENCE)

    expect(info).toMatchObject({ current: 2, longest: 2, extendedToday: false })
  })

  it('drops the current streak when both today and yesterday are empty', () => {
    const info = computeStreak(['2026-11-20', '2026-11-21', '2026-11-22'], REFERENCE)

    expect(info).toMatchObject({ current: 0, longest: 3, extendedToday: false })
    expect(info.last7.filter((day) => day.active).map((day) => day.day)).toEqual([
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
    ])
  })

  it('treats one day as a streak of one', () => {
    const info = computeStreak(['2026-11-26'], REFERENCE)

    expect(info).toMatchObject({ current: 1, longest: 1, extendedToday: true })
  })

  it('keeps the longest run from the past', () => {
    const info = computeStreak(
      ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-26'],
      REFERENCE,
    )

    expect(info).toMatchObject({ current: 1, longest: 5, extendedToday: true })
  })

  it('marks last 7 days and applies the session threshold', () => {
    const info = computeStreak(['2026-11-19', '2026-11-20', '2026-11-26'], REFERENCE)

    expect(info.last7).toEqual([
      { day: '2026-11-20', active: true },
      { day: '2026-11-21', active: false },
      { day: '2026-11-22', active: false },
      { day: '2026-11-23', active: false },
      { day: '2026-11-24', active: false },
      { day: '2026-11-25', active: false },
      { day: '2026-11-26', active: true },
    ])
    expect(isStreakSession({ durationMs: 59_999, pagesRead: 0 })).toBe(false)
    expect(isStreakSession({ durationMs: 60_000, pagesRead: 0 })).toBe(true)
    expect(isStreakSession({ durationMs: 0, pagesRead: 1 })).toBe(true)
  })
})
