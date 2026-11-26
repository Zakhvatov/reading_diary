export function cleanIsbn(value: string): string {
  return value
    .replace(/^isbn(?:-1[03])?\s*:?\s*/i, '')
    .replace(/[^0-9Xx]/g, '')
    .toUpperCase()
}

export function isValidIsbn10(value: string): boolean {
  const isbn = cleanIsbn(value)

  if (!/^\d{9}[\dX]$/.test(isbn)) {
    return false
  }

  let sum = 0
  for (let index = 0; index < 9; index += 1) {
    sum += Number(isbn[index]) * (10 - index)
  }
  sum += isbn[9] === 'X' ? 10 : Number(isbn[9])

  return sum % 11 === 0
}

export function isValidIsbn13(value: string): boolean {
  const isbn = cleanIsbn(value)

  if (!/^97[89]\d{10}$/.test(isbn)) {
    return false
  }

  let sum = 0
  for (let index = 0; index < 12; index += 1) {
    sum += Number(isbn[index]) * (index % 2 === 0 ? 1 : 3)
  }

  return (10 - (sum % 10)) % 10 === Number(isbn[12])
}

export function isbn10To13(value: string): string {
  const core = `978${cleanIsbn(value).slice(0, 9)}`
  let sum = 0
  for (let index = 0; index < 12; index += 1) {
    sum += Number(core[index]) * (index % 2 === 0 ? 1 : 3)
  }
  return `${core}${(10 - (sum % 10)) % 10}`
}

export function normalizeIsbn(input: string): { isbn13?: string; isbn10?: string } | null {
  const isbn = cleanIsbn(input)

  if (isValidIsbn13(isbn)) {
    return { isbn13: isbn }
  }

  if (isValidIsbn10(isbn)) {
    return { isbn13: isbn10To13(isbn), isbn10: isbn }
  }

  return null
}
