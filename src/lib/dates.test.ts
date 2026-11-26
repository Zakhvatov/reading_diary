import { describe, expect, it } from 'vitest'
import { monthDays, parseDay, toDay, weekBounds, weekDays } from './dates'

describe('dates', () => {
  it('formats a local calendar day without a UTC shift', () => {
    expect(toDay(new Date(2026, 10, 26, 23, 30))).toBe('2026-11-26')
    expect(toDay(new Date(2026, 10, 26, 0, 5))).toBe('2026-11-26')
  })

  it('parses a day back to local midnight', () => {
    const date = parseDay('2026-11-26')
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(10)
    expect(date.getDate()).toBe(26)
    expect(toDay(date)).toBe('2026-11-26')
  })

  it('builds a Monday-first week', () => {
    const days = weekDays('2026-11-26')
    expect(days).toHaveLength(7)
    expect(days[0]).toBe('2026-11-23')
    expect(days[6]).toBe('2026-11-29')
  })

  it('returns inclusive week bounds', () => {
    expect(weekBounds('2026-11-26')).toEqual({ start: '2026-11-23', end: '2026-11-29' })
  })

  it('handles leap february', () => {
    expect(monthDays('2026-02-10')).toHaveLength(28)
    expect(monthDays('2024-02-10')).toHaveLength(29)
  })
})
