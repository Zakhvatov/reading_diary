import { parseDay } from './dates'
import { formatRating, ratingFromStars, ratingToStars } from './rating'
import { daysRead } from './days'
import { describe, expect, it } from 'vitest'

describe('rating', () => {
  it('converts stars to the canonical 0…10 scale and back', () => {
    expect(ratingFromStars(4)).toBe(8)
    expect(ratingFromStars(4.5)).toBe(9)
    expect(ratingToStars(8)).toBe(4)
    expect(ratingToStars(9)).toBe(4.5)
  })

  it('keeps a round trip stable', () => {
    for (const stars of [0.5, 1, 2.5, 3, 4.5, 5]) {
      expect(ratingToStars(ratingFromStars(stars))).toBe(stars)
    }
  })

  it('clamps to 0…10 and rounds to half steps', () => {
    expect(ratingFromStars(7)).toBe(10)
    expect(ratingFromStars(-2)).toBe(0)
    expect(ratingToStars(11)).toBe(5)
    expect(ratingToStars(-1)).toBe(0)
  })

  it('drops non-numeric values', () => {
    expect(ratingFromStars(Number.NaN)).toBe(0)
    expect(ratingToStars(Number.POSITIVE_INFINITY)).toBe(5)
  })

  it('formats each scale in Russian', () => {
    expect(formatRating(8, 'stars5')).toBe('4 из 5')
    expect(formatRating(8.5, 'score10')).toBe('8,5 из 10')
    expect(formatRating(9, 'emotion', 'love')).toBe('Восторг')
    expect(formatRating(undefined, 'stars5')).toBe('Без оценки')
  })
})

describe('daysRead', () => {
  it('counts both start and finish days', () => {
    expect(daysRead('2026-01-01', '2026-01-12')).toBe(12)
  })

  it('returns 1 for a book read in one day', () => {
    expect(daysRead('2026-01-01', '2026-01-01')).toBe(1)
  })

  it('counts up to today when the book is still being read', () => {
    expect(daysRead('2026-01-01', undefined, parseDay('2026-01-10'))).toBe(10)
  })

  it('never returns zero or negative, even with reversed dates', () => {
    expect(daysRead('2026-01-10', '2026-01-01')).toBe(1)
  })

  it('returns undefined without a start date', () => {
    expect(daysRead(undefined, '2026-01-01')).toBeUndefined()
  })

  it('ignores time zones because dates are local calendar days', () => {
    expect(daysRead('2026-03-28', '2026-03-30')).toBe(3)
  })
})
