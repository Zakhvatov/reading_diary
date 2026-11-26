import { describe, expect, it } from 'vitest'
import { quoteCardFileName, wrapText } from './quoteCard'

const measure = (line: string) => line.length * 10

describe('wrapText', () => {
  it('keeps a short line as is', () => {
    expect(wrapText('Коротко', 200, measure)).toEqual(['Коротко'])
  })

  it('wraps at word boundaries', () => {
    expect(wrapText('один два три', 100, measure)).toEqual(['один два', 'три'])
  })

  it('never returns a line wider than the limit', () => {
    const lines = wrapText('Мастер и Маргарита — роман Михаила Булгакова', 120, measure)

    expect(lines.length).toBeGreaterThan(1)
    for (const line of lines) expect(measure(line)).toBeLessThanOrEqual(120)
  })

  it('splits a word that is wider than the card', () => {
    expect(wrapText('abcdefghijk', 50, measure)).toEqual(['abcde', 'fghij', 'k'])
  })

  it('keeps empty lines between paragraphs and trims the edges', () => {
    expect(wrapText('\nПервая строка\n\nВторая\n', 200, measure)).toEqual([
      'Первая строка',
      '',
      'Вторая',
    ])
  })

  it('returns nothing for blank input', () => {
    expect(wrapText('   \n  ', 100, measure)).toEqual([])
  })
})

describe('quoteCardFileName', () => {
  it('builds a readable file name without forbidden characters', () => {
    expect(quoteCardFileName('Тест: "книга"/роман')).toBe('цитата-тест-книга-роман.png')
  })

  it('falls back to a generic name', () => {
    expect(quoteCardFileName(' /// ')).toBe('цитата-книга.png')
  })
})
