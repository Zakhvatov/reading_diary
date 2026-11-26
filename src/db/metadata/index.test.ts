import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/db/db'
import { lookupIsbn, searchBooks } from './index'

const OL_DOC = {
  key: '/works/OL1W',
  title: 'Пикник на обочине',
  author_name: ['Аркадий Стругацкий'],
  first_publish_year: 1972,
  isbn: ['9785170902583'],
  language: ['rus'],
}

const FEED = {
  feed: {
    entry: [
      {
        id: { $t: 'https://www.google.com/books/feeds/volumes/feed-1' },
        title: { type: 'text', $t: 'Мастер и Маргарита' },
        dc$creator: [{ $t: 'Михаил Булгаков' }],
        dc$identifier: [{ $t: 'ISBN:9785170902583' }],
        dc$language: [{ $t: 'ru' }],
      },
    ],
  },
}

const GB_ITEM = {
  id: 'google-1',
  volumeInfo: {
    title: 'Дюна',
    authors: ['Фрэнк Герберт'],
    industryIdentifiers: [{ type: 'ISBN_13', identifier: '9785170902583' }],
  },
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function stubFetch(handler: (url: string) => Response) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => handler(String(input)))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function requestedUrl(fetchMock: { mock: { calls: unknown[][] } }, index: number): string {
  return String(fetchMock.mock.calls[index]?.[0])
}

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

afterAll(() => {
  db.close()
})

describe('searchBooks', () => {
  it('fetches once and serves repeated searches from the cache', async () => {
    const fetchMock = stubFetch(() => jsonResponse(FEED))

    const first = await searchBooks('Мастер')
    expect(first).toHaveLength(1)
    expect(first[0]).toMatchObject({ source: 'googlebooks', title: 'Мастер и Маргарита' })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const url = requestedUrl(fetchMock, 0)
    expect(url).toContain('books.google.com/books/feeds/volumes')
    expect(url).toContain('alt=json')
    expect(url).toContain('max-results=20')

    const second = await searchBooks('  МАСТЕР ')
    expect(second).toEqual(first)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns an empty list for queries shorter than two characters', async () => {
    const fetchMock = stubFetch(() => jsonResponse(FEED))

    expect(await searchBooks(' я ')).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('falls back to the Books API, then Open Library', async () => {
    const fetchMock = stubFetch((url) => {
      if (url.includes('books.google.com/books/feeds')) return jsonResponse({ feed: {} })
      if (url.includes('googleapis.com')) return jsonResponse({ items: [GB_ITEM] })
      return jsonResponse({ docs: [OL_DOC] })
    })

    const results = await searchBooks('Дюна')
    expect(results[0]).toMatchObject({ source: 'googlebooks', title: 'Дюна' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(requestedUrl(fetchMock, 0)).toContain('books.google.com/books/feeds')
    expect(requestedUrl(fetchMock, 1)).toContain('googleapis.com')

    const cached = await searchBooks('дюна')
    expect(cached).toEqual(results)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('uses Open Library when both Google sources are empty', async () => {
    const fetchMock = stubFetch((url) =>
      url.includes('openlibrary.org') ? jsonResponse({ docs: [OL_DOC] }) : jsonResponse({}),
    )

    const results = await searchBooks('Пикник')
    expect(results[0]).toMatchObject({ source: 'openlibrary', title: 'Пикник на обочине' })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(requestedUrl(fetchMock, 2)).toContain('openlibrary.org/search.json')
  })

  it('refetches when the cached entry is older than its TTL', async () => {
    const fetchMock = stubFetch(() => jsonResponse(FEED))

    await db.meta.put({
      key: 'search:мастер',
      kind: 'search',
      payload: [
        { source: 'openlibrary', sourceId: '/works/OLD', title: 'Старое', authors: [], genres: [] },
      ],
      fetchedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
      ttlDays: 30,
    })

    const results = await searchBooks('мастер')
    expect(results[0]?.title).toBe('Мастер и Маргарита')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('drops malformed cache entries and refetches', async () => {
    const fetchMock = stubFetch(() => jsonResponse(FEED))

    await db.meta.put({
      key: 'search:тест',
      kind: 'search',
      payload: [{ title: 42 }, 'nope', { source: 'unknown', title: 'Книга' }],
      fetchedAt: new Date().toISOString(),
      ttlDays: 30,
    })

    const results = await searchBooks('тест')
    expect(results[0]?.title).toBe('Мастер и Маргарита')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('lookupIsbn', () => {
  it('looks up a normalized ISBN-13 and caches the result', async () => {
    const fetchMock = stubFetch(() => jsonResponse(FEED))

    const results = await lookupIsbn('978-5-17-090258-3')
    expect(results).toHaveLength(1)

    const url = decodeURIComponent(requestedUrl(fetchMock, 0))
    expect(url).toContain('q=isbn:9785170902583')
    expect(await db.meta.get('isbn:9785170902583')).toBeTruthy()

    expect(await lookupIsbn('9785170902583')).toEqual(results)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns an empty list for an invalid ISBN without network access', async () => {
    const fetchMock = stubFetch(() => jsonResponse({}))

    expect(await lookupIsbn('123-4')).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
