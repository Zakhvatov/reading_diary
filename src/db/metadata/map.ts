import { normalizeIsbn } from '@/lib/isbn'
import type { BookDraft } from './types'

type JsonObject = Record<string, unknown>

const AUTHOR_LIMIT = 4
const GENRE_LIMIT = 4

const OPEN_LIBRARY_LANGUAGES: Record<string, string> = {
  rus: 'ru',
  eng: 'en',
  fre: 'fr',
  fra: 'fr',
  ger: 'de',
  deu: 'de',
}

function asRecord(value: unknown): JsonObject | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : null
}

function asString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const text = value.trim()
  return text === '' ? undefined : text
}

function asStringList(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return []

  const items: string[] = []
  for (const entry of value) {
    const text = asString(entry)
    if (text) items.push(text)
    if (items.length >= limit) break
  }

  return [...new Set(items)]
}

function firstString(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const text = asString(entry)
      if (text) return text
    }
    return undefined
  }
  return asString(value)
}

function asPositiveInteger(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return undefined
  }
  return Math.round(value)
}

function asYear(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0 || value > 3000) {
    return undefined
  }
  return value
}

function parsePublishedYear(value: unknown): number | undefined {
  const text = asString(value)
  if (!text) return undefined

  const match = /^(\d{4})/.exec(text)
  return match ? asYear(Number(match[1])) : undefined
}

function pickIsbn13(values: unknown): string | undefined {
  if (!Array.isArray(values)) return undefined

  const candidates = values
    .filter((value): value is string => typeof value === 'string')
    .map((value) => normalizeIsbn(value))
    .filter((value): value is NonNullable<ReturnType<typeof normalizeIsbn>> => value !== null)

  const direct = candidates.find((value) => value.isbn10 === undefined)
  return (direct ?? candidates[0])?.isbn13
}

function pickGoogleIsbn13(identifiers: unknown): string | undefined {
  if (!Array.isArray(identifiers)) return undefined

  const values: string[] = []
  for (const entry of identifiers) {
    const record = asRecord(entry)
    const identifier = record ? asString(record.identifier) : undefined
    if (identifier) values.push(identifier)
  }

  return pickIsbn13(values)
}

function mapOpenLibraryLanguage(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined

  for (const entry of value) {
    const code = asString(entry)
    if (!code) continue

    const mapped = OPEN_LIBRARY_LANGUAGES[code.toLowerCase()]
    if (mapped) return mapped
  }

  return undefined
}

function mapGoogleLanguage(value: unknown): string | undefined {
  const text = asString(value)
  if (!text) return undefined

  const code = text.toLowerCase()
  return /^[a-z]{2,3}$/.test(code) ? code : undefined
}

export function mapOpenLibraryDocs(payload: unknown): BookDraft[] {
  const root = asRecord(payload)
  const docs = root ? root.docs : undefined
  if (!Array.isArray(docs)) return []

  const drafts: BookDraft[] = []

  for (const entry of docs) {
    const doc = asRecord(entry)
    if (!doc) continue

    const title = asString(doc.title)
    if (!title) continue

    const draft: BookDraft = {
      source: 'openlibrary',
      sourceId: asString(doc.key) ?? title,
      title,
      authors: asStringList(doc.author_name, AUTHOR_LIMIT),
      genres: asStringList(doc.subject, GENRE_LIMIT),
    }

    const isbn13 = pickIsbn13(doc.isbn)
    if (isbn13) draft.isbn13 = isbn13

    const pageCount = asPositiveInteger(doc.number_of_pages_median)
    if (pageCount) draft.pageCount = pageCount

    const publishedYear = asYear(doc.first_publish_year)
    if (publishedYear) draft.publishedYear = publishedYear

    const publisher = firstString(doc.publisher)
    if (publisher) draft.publisher = publisher

    const language = mapOpenLibraryLanguage(doc.language)
    if (language) draft.language = language

    const coverId = asPositiveInteger(doc.cover_i)
    if (coverId) draft.coverUrl = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`

    drafts.push(draft)
  }

  return drafts
}

export function mapGoogleVolumes(payload: unknown): BookDraft[] {
  const root = asRecord(payload)
  const items = root ? root.items : undefined
  if (!Array.isArray(items)) return []

  const drafts: BookDraft[] = []

  for (const entry of items) {
    const item = asRecord(entry)
    if (!item) continue

    const info = asRecord(item.volumeInfo)
    if (!info) continue

    const title = asString(info.title)
    if (!title) continue

    const draft: BookDraft = {
      source: 'googlebooks',
      sourceId: asString(item.id) ?? title,
      title,
      authors: asStringList(info.authors, AUTHOR_LIMIT),
      genres: asStringList(info.categories, GENRE_LIMIT),
    }

    const isbn13 = pickGoogleIsbn13(info.industryIdentifiers)
    if (isbn13) draft.isbn13 = isbn13

    const pageCount = asPositiveInteger(info.pageCount)
    if (pageCount) draft.pageCount = pageCount

    const publishedYear = parsePublishedYear(info.publishedDate)
    if (publishedYear) draft.publishedYear = publishedYear

    const publisher = asString(info.publisher)
    if (publisher) draft.publisher = publisher

    const language = mapGoogleLanguage(info.language)
    if (language) draft.language = language

    const description = asString(info.description)
    if (description) draft.description = description

    const links = asRecord(info.imageLinks)
    const thumbnail = links ? asString(links.thumbnail) : undefined
    if (thumbnail) {
      draft.coverUrl = thumbnail.replace(/^http:\/\//i, 'https://')
    }

    drafts.push(draft)
  }

  return drafts
}
