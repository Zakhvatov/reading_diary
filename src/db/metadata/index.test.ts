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
    const fetchMock = stubFetch(() => jsonResponse({ docs: [OL_DOC] }))

    const first = await searchBooks('Пикник')
    expect(first).toHaveLength(1)
    expect(first[0]?.title).toBe('Пикник на обочине')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const url = requestedUrl(fetchMock, 0)
    expect(url).toContain('openlibrary.org/search.json')
    expect(url).toContain('limit=20')
    expect(url).toContain('fields=')

    const second = await searchBooks('  ПИКНИК ')
    expect(second).toEqual(first)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns an empty list for queries shorter than two characters', async () => {
    const fetchMock = stubFetch(() => jsonResponse({ docs: [] }))

    expect(await searchBooks(' я ')).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('falls back to Google Books when Open Library has no results', async () => {
    const fetchMock = stubFetch((url) =>
      url.includes('openlibrary.org')
        ? jsonResponse({ docs: [] })
        : jsonResponse({ items: [GB_ITEM] }),
    )

    const results = await searchBooks('Дюна')
    expect(results[0]).toMatchObject({ source: 'googlebooks', title: 'Дюна' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(requestedUrl(fetchMock, 0)).toContain('openlibrary.org')
    expect(requestedUrl(fetchMock, 1)).toContain('googleapis.com')

    const cached = await searchBooks('дюна')
    expect(cached).toEqual(results)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('refetches when the cached entry is older than its TTL', async () => {
    const fetchMock = stubFetch(() => jsonResponse({ docs: [OL_DOC] }))

    await db.meta.put({
      key: 'search:пикник',
      kind: 'search',
      payload: [
        { source: 'openlibrary', sourceId: '/works/OLD', title: 'Старое', authors: [], genres: [] },
      ],
      fetchedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
      ttlDays: 30,
    })

    const results = await searchBooks('пикник')
    expect(results[0]?.title).toBe('Пикник на обочине')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('drops malformed cache entries and refetches', async () => {
    const fetchMock = stubFetch(() => jsonResponse({ docs: [OL_DOC] }))

    await db.meta.put({
      key: 'search:тест',
      kind: 'search',
      payload: [{ title: 42 }, 'nope', { source: 'unknown', title: 'Книга' }],
      fetchedAt: new Date().toISOString(),
      ttlDays: 30,
    })

    const results = await searchBooks('тест')
    expect(results[0]?.title).toBe('Пикник на обочине')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('lookupIsbn', () => {
  it('looks up a normalized ISBN-13 and caches the result', async () => {
    const fetchMock = stubFetch(() => jsonResponse({ docs: [OL_DOC] }))

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
