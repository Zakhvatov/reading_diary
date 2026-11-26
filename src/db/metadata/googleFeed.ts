import { fetchJson } from './client'
import { mapGoogleFeed } from './map'
import type { BookDraft } from './types'

const ENDPOINT = 'https://books.google.com/books/feeds/volumes'
const RESULT_LIMIT = 20

/**
 * Atom-feed Google Books: без API-ключа и без квоты публичного Books API.
 * CORS отдаётся только для `alt=json`, поэтому responseType обычный fetch.
 */
export async function searchGoogleFeed(query: string, signal?: AbortSignal): Promise<BookDraft[]> {
  const params = new URLSearchParams({
    q: query,
    alt: 'json',
    'max-results': String(RESULT_LIMIT),
  })

  const payload = await fetchJson(`${ENDPOINT}?${params.toString()}`, signal)
  return mapGoogleFeed(payload)
}
