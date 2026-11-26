import { describe, expect, it } from 'vitest'
import { formatDuration, formatPercent, pluralRu } from './format'

describe('pluralRu', () => {
  it('picks the right form', () => {
    expect(pluralRu(1, ['книга', 'книги', 'книг'])).toBe('книга')
    expect(pluralRu(3, ['книга', 'книги', 'книг'])).toBe('книги')
    expect(pluralRu(11, ['книга', 'книги', 'книг'])).toBe('книг')
    expect(pluralRu(21, ['книга', 'книги', 'книг'])).toBe('книга')
  })
})

describe('formatDuration', () => {
  it('formats minutes and hours', () => {
    expect(formatDuration(30_000)).toBe('меньше минуты')
    expect(formatDuration(45 * 60_000)).toBe('45 мин')
    expect(formatDuration(65 * 60_000)).toBe('1 час 5 мин')
    expect(formatDuration(120 * 60_000)).toBe('2 часа')
  })
})

describe('formatPercent', () => {
  it('rounds and clamps', () => {
    expect(formatPercent(0.426)).toBe('43%')
    expect(formatPercent(2)).toBe('100%')
    expect(formatPercent(-1)).toBe('0%')
  })
})
