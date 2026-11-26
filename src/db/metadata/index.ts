import { db } from '@/db/db'
import { normalizeIsbn } from '@/lib/isbn'
import { searchGoogleFeed } from './googleFeed'
import { searchGoogleBooks } from './googleBooks'
import { searchOpenLibrary } from './openLibrary'
import type { BookDraft, MetadataSource } from './types'

const CACHE_TTL_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000
const MIN_QUERY_LENGTH = 2

type CacheKind = 'search' | 'isbn'

function isSource(value: unknown): value is MetadataSource {
  return value === 'openlibrary' || value === 'googlebooks'
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === 'string')
}

function sanitizeDraft(value: unknown): BookDraft | null {
  if (typeof value !== 'object' || value === null) return null
  const item = value as Record<string, unknown>

  const title = item.title
  const sourceId = item.sourceId
  const source = item.source
  if (typeof title !== 'string' || title.trim() === '') return null
  if (!isSource(source)) return null
  if (typeof sourceId !== 'string') return null

  const draft: BookDraft = {
    source,
    sourceId,
    title,
    authors: asStringArray(item.authors),
    genres: asStringArray(item.genres),
  }

  if (typeof item.isbn13 === 'string') draft.isbn13 = item.isbn13
  if (typeof item.pageCount === 'number' && Number.isFinite(item.pageCount)) {
    draft.pageCount = item.pageCount
  }
  if (typeof item.publishedYear === 'number' && Number.isFinite(item.publishedYear)) {
    draft.publishedYear = item.publishedYear
  }
  if (typeof item.publisher === 'string') draft.publisher = item.publisher
  if (typeof item.language === 'string') draft.language = item.language
  if (typeof item.description === 'string') draft.description = item.description
  if (typeof item.coverUrl === 'string') draft.coverUrl = item.coverUrl

  return draft
}

async function readCache(key: string): Promise<BookDraft[] | null> {
  const record = await db.meta.get(key)
  if (!record) return null

  const fetchedAt = Date.parse(record.fetchedAt)
  if (!Number.isFinite(fetchedAt) || Date.now() - fetchedAt >= record.ttlDays * DAY_MS) {
    return null
  }

  if (!Array.isArray(record.payload)) return null

  const drafts = record.payload
    .map(sanitizeDraft)
    .filter((draft): draft is BookDraft => draft !== null)

  return drafts.length > 0 ? drafts : null
}

async function writeCache(key: string, kind: CacheKind, drafts: BookDraft[]): Promise<void> {
  await db.meta.put({
    key,
    kind,
    payload: drafts,
    fetchedAt: new Date().toISOString(),
    ttlDays: CACHE_TTL_DAYS,
  })
}

async function fetchDrafts(query: string, signal?: AbortSignal): Promise<BookDraft[]> {
  let firstError: unknown

  for (const search of [searchGoogleFeed, searchGoogleBooks, searchOpenLibrary]) {
    try {
      const drafts = await search(query, signal)
      if (drafts.length > 0) return drafts
    } catch (error) {
      if (signal?.aborted) throw error
      firstError ??= error
    }
  }

  if (firstError) throw firstError
  return []
}

export async function searchBooks(query: string, signal?: AbortSignal): Promise<BookDraft[]> {
  const trimmed = query.trim()
  if (trimmed.length < MIN_QUERY_LENGTH) return []

  const key = `search:${trimmed.toLowerCase()}`
  const cached = await readCache(key)
  if (cached) return cached

  const drafts = await fetchDrafts(trimmed, signal)
  if (drafts.length > 0) {
    await writeCache(key, 'search', drafts)
  }
  return drafts
}

export async function lookupIsbn(isbn: string, signal?: AbortSignal): Promise<BookDraft[]> {
  const isbn13 = normalizeIsbn(isbn)?.isbn13
  if (!isbn13) return []

  const key = `isbn:${isbn13}`
  const cached = await readCache(key)
  if (cached) return cached

  const drafts = await fetchDrafts(`isbn:${isbn13}`, signal)
  if (drafts.length > 0) {
    await writeCache(key, 'isbn', drafts)
  }
  return drafts
}
