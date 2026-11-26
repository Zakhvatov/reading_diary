import { describe, expect, it } from 'vitest'
import { mapGoogleVolumes, mapOpenLibraryDocs } from './map'

describe('mapOpenLibraryDocs', () => {
  const doc = {
    key: '/works/OL42W',
    title: 'Пикник на обочине',
    author_name: ['Аркадий Стругацкий', 'Борис Стругацкий'],
    first_publish_year: 1972,
    publisher: ['Молодая гвардия', 'Другое издательство'],
    isbn: ['5170902581', '9785170902583'],
    cover_i: 12345,
    number_of_pages_median: 256,
    language: ['rus'],
    subject: ['Фантастика', 'Фантастика', 'Повесть', 'Классика', 'Лишний жанр'],
  }

  it('maps a search doc into a book draft', () => {
    const [draft] = mapOpenLibraryDocs({ docs: [doc] })

    expect(draft).toEqual({
      source: 'openlibrary',
      sourceId: '/works/OL42W',
      title: 'Пикник на обочине',
      authors: ['Аркадий Стругацкий', 'Борис Стругацкий'],
      isbn13: '9785170902583',
      pageCount: 256,
      publishedYear: 1972,
      publisher: 'Молодая гвардия',
      language: 'ru',
      genres: ['Фантастика', 'Повесть', 'Классика'],
      coverUrl: 'https://covers.openlibrary.org/b/id/12345-L.jpg',
    })
  })

  it('converts an ISBN-10 when no ISBN-13 is present', () => {
    const [draft] = mapOpenLibraryDocs({
      docs: [{ key: '/works/OL1W', title: 'Книга', isbn: ['5170902581'] }],
    })

    expect(draft?.isbn13).toBe('9785170902583')
  })

  it('falls back to the title when the key is missing', () => {
    const [draft] = mapOpenLibraryDocs({ docs: [{ title: 'Без ключа' }] })

    expect(draft).toEqual({
      source: 'openlibrary',
      sourceId: 'Без ключа',
      title: 'Без ключа',
      authors: [],
      genres: [],
    })
  })

  it('ignores invalid numbers and caps long lists', () => {
    const [draft] = mapOpenLibraryDocs({
      docs: [
        {
          key: '/works/OL7W',
          title: 'Книга',
          author_name: ['A', 'B', 'C', 'D', 'E'],
          first_publish_year: -5,
          number_of_pages_median: Number.NaN,
          cover_i: -1,
          subject: ['1', '2', '3', '4', '5'],
          language: ['jpn'],
        },
      ],
    })

    expect(draft?.authors).toEqual(['A', 'B', 'C', 'D'])
    expect(draft?.genres).toEqual(['1', '2', '3', '4'])
    expect(draft?.publishedYear).toBeUndefined()
    expect(draft?.pageCount).toBeUndefined()
    expect(draft?.coverUrl).toBeUndefined()
    expect(draft?.language).toBeUndefined()
  })

  it('returns an empty list for garbage input', () => {
    expect(mapOpenLibraryDocs(null)).toEqual([])
    expect(mapOpenLibraryDocs('nope')).toEqual([])
    expect(mapOpenLibraryDocs({})).toEqual([])
    expect(mapOpenLibraryDocs({ docs: 'nope' })).toEqual([])
    expect(mapOpenLibraryDocs({ docs: [null, 42, 'x', {}, { title: '   ' }] })).toEqual([])
  })
})

describe('mapGoogleVolumes', () => {
  const volume = {
    id: 'volume-1',
    volumeInfo: {
      title: 'Дюна',
      authors: ['Фрэнк Герберт'],
      publishedDate: '1965-08-01',
      publisher: 'АСТ',
      pageCount: 704,
      language: 'ru',
      categories: ['Фантастика', 'Роман'],
      description: 'Описание',
      industryIdentifiers: [
        { type: 'ISBN_10', identifier: '5170902581' },
        { type: 'ISBN_13', identifier: '9785170902583' },
      ],
      imageLinks: {
        thumbnail: 'http://books.google.com/books/content?id=abc&printsec=frontcover',
      },
    },
  }

  it('maps a volume into a book draft', () => {
    const [draft] = mapGoogleVolumes({ items: [volume] })

    expect(draft).toEqual({
      source: 'googlebooks',
      sourceId: 'volume-1',
      title: 'Дюна',
      authors: ['Фрэнк Герберт'],
      isbn13: '9785170902583',
      pageCount: 704,
      publishedYear: 1965,
      publisher: 'АСТ',
      language: 'ru',
      genres: ['Фантастика', 'Роман'],
      description: 'Описание',
      coverUrl: 'https://books.google.com/books/content?id=abc&printsec=frontcover',
    })
  })

  it('converts an ISBN-10 when only that identifier is present', () => {
    const [draft] = mapGoogleVolumes({
      items: [
        {
          id: 'volume-2',
          volumeInfo: {
            title: 'Книга',
            industryIdentifiers: [{ type: 'ISBN_10', identifier: '5170902581' }],
          },
        },
      ],
    })

    expect(draft?.isbn13).toBe('9785170902583')
  })

  it('skips broken items and invalid years', () => {
    expect(mapGoogleVolumes(null)).toEqual([])
    expect(mapGoogleVolumes({ items: 'nope' })).toEqual([])
    expect(
      mapGoogleVolumes({
        items: [null, 42, {}, { id: 'x' }, { volumeInfo: { title: '   ' } }],
      }),
    ).toEqual([])

    const [draft] = mapGoogleVolumes({
      items: [{ id: 'y', volumeInfo: { title: 'Книга', publishedDate: 'скоро' } }],
    })
    expect(draft?.publishedYear).toBeUndefined()
  })
})
