import { describe, expect, it } from 'vitest'
import { normalizeBase } from './normalizeBase'

describe('normalizeBase', () => {
  it('keeps the site root', () => {
    expect(normalizeBase(undefined)).toBe('/')
    expect(normalizeBase('')).toBe('/')
    expect(normalizeBase('/')).toBe('/')
  })

  it('adds leading and trailing slashes', () => {
    expect(normalizeBase('reading_diary')).toBe('/reading_diary/')
    expect(normalizeBase('/reading_diary')).toBe('/reading_diary/')
    expect(normalizeBase('reading_diary/')).toBe('/reading_diary/')
  })

  it('keeps an already normalized base', () => {
    expect(normalizeBase('/reading_diary/')).toBe('/reading_diary/')
  })
})
