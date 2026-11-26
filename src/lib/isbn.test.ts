import { describe, expect, it } from 'vitest'
import { cleanIsbn, isbn10To13, isValidIsbn10, isValidIsbn13, normalizeIsbn } from './isbn'

describe('ISBN', () => {
  it('cleans separators and prefixes', () => {
    expect(cleanIsbn('ISBN 978-5-17-090258-3')).toBe('9785170902583')
    expect(cleanIsbn(' 517090258X ')).toBe('517090258X')
  })

  it('validates ISBN-13 checksum', () => {
    expect(isValidIsbn13('9785170902583')).toBe(true)
    expect(isValidIsbn13('978-5-17-090258-4')).toBe(false)
    expect(isValidIsbn13('1234567890123')).toBe(false)
  })

  it('validates ISBN-10 checksum and X digit', () => {
    expect(isValidIsbn10('5170902581')).toBe(true)
    expect(isValidIsbn10('5170902589')).toBe(false)
    expect(isValidIsbn10('043942089X')).toBe(true)
  })

  it('converts ISBN-10 to ISBN-13', () => {
    expect(isbn10To13('5170902581')).toBe('9785170902583')
  })

  it('normalizes either format to canonical ISBN-13', () => {
    expect(normalizeIsbn('978-5-17-090258-3')).toEqual({ isbn13: '9785170902583' })
    expect(normalizeIsbn('5170902581')).toEqual({
      isbn13: '9785170902583',
      isbn10: '5170902581',
    })
  })

  it('returns null for garbage', () => {
    expect(normalizeIsbn('не ISBN')).toBeNull()
    expect(normalizeIsbn('978517090258')).toBeNull()
    expect(normalizeIsbn('')).toBeNull()
  })
})
