import { fetchJson } from './client'
import { mapOpenLibraryDocs } from './map'
import type { BookDraft } from './types'

const BASE_URL = 'https://openlibrary.org'
const RESULT_LIMIT = 20
const FIELDS = [
  'key',
  'title',
  'author_name',
  'first_publish_year',
  'publisher',
  'isbn',
  'cover_i',
  'number_of_pages_median',
  'language',
  'subject',
].join(',')

export async function searchOpenLibrary(query: string, signal?: AbortSignal): Promise<BookDraft[]> {
  const params = new URLSearchParams({
    q: query,
    limit: String(RESULT_LIMIT),
    fields: FIELDS,
  })
  const payload = await fetchJson(`${BASE_URL}/search.json?${params.toString()}`, signal)
  return mapOpenLibraryDocs(payload)
}
