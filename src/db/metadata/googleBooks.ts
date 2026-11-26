import { fetchJson } from './client'
import { mapGoogleVolumes } from './map'
import type { BookDraft } from './types'

const ENDPOINT = 'https://www.googleapis.com/books/v1/volumes'
const RESULT_LIMIT = 20
const API_KEY: unknown = import.meta.env.VITE_GOOGLE_BOOKS_KEY

function readApiKey(): string | undefined {
  return typeof API_KEY === 'string' && API_KEY.trim() !== '' ? API_KEY.trim() : undefined
}

export async function searchGoogleBooks(query: string, signal?: AbortSignal): Promise<BookDraft[]> {
  const params = new URLSearchParams({
    q: query,
    maxResults: String(RESULT_LIMIT),
  })

  const apiKey = readApiKey()
  if (apiKey) params.set('key', apiKey)

  const payload = await fetchJson(`${ENDPOINT}?${params.toString()}`, signal)
  return mapGoogleVolumes(payload)
}
