import { describe, expect, it } from 'vitest'
import type { Book, BookLink, BookNote, Character, Quote } from '@/db/types'
import { buildDiaryMarkdown, diaryExportSections } from './markdownExport'

const book: Book = {
  id: 'book-1',
  title: 'Мастер и Маргарита',
  subtitle: 'Роман',
  authors: ['Михаил Булгаков'],
  publisher: 'АСТ',
  publishedYear: 2020,
  pageCount: 480,
  isbn13: '9785170902583',
  language: 'ru',
  genres: ['роман', 'мистика'],
  status: 'finished',
  progressMode: 'pages',
  currentPage: 480,
  percent: 100,
  rating: 9,
  ratingScale: 'stars5',
  tags: ['классика', 'мистика'],
  moods: ['мрачное'],
  format: 'paper',
  acquisition: 'bought',
  colorLabel: 'none',
  diaryTemplate: 'analyst',
  shareable: false,
  startedAt: '2026-01-12',
  finishedAt: '2026-01-24',
  totalReadingMs: 3_600_000,
  sessionCount: 2,
  pagesReadTotal: 480,
  createdAt: '2026-01-12T09:00:00.000Z',
  updatedAt: '2026-01-24T20:00:00.000Z',
}

const publicQuote: Quote = {
  id: 'quote-1',
  bookId: book.id,
  text: 'Рукописи не горят.',
  page: 42,
  chapter: 'Глава 7',
  note: 'Главная мысль',
  favorite: true,
  shareable: true,
  createdAt: '2026-01-13T09:00:00.000Z',
  updatedAt: '2026-01-13T09:00:00.000Z',
}

const privateQuote: Quote = {
  id: 'quote-2',
  bookId: book.id,
  text: 'Личная цитата, которой нет в экспорте для других.',
  favorite: false,
  shareable: false,
  createdAt: '2026-01-14T09:00:00.000Z',
  updatedAt: '2026-01-14T09:00:00.000Z',
}

const character: Character = {
  id: 'character-1',
  bookId: book.id,
  name: 'Воланд',
  role: 'антагонист',
  note: 'Приносит хаос и справедливость.',
  spoiler: true,
  createdAt: '2026-01-15T09:00:00.000Z',
  updatedAt: '2026-01-15T09:00:00.000Z',
}

const notes: BookNote[] = [
  {
    id: 'note-1',
    bookId: book.id,
    kind: 'plot',
    chapter: 'Глава 10',
    body: 'Поздняя сцена.',
    tags: [],
    order: 0,
    createdAt: '2026-01-16T09:00:00.000Z',
    updatedAt: '2026-01-16T09:00:00.000Z',
  },
  {
    id: 'note-2',
    bookId: book.id,
    kind: 'plot',
    chapter: 'Глава 2',
    body: 'Ранняя сцена.',
    tags: [],
    order: 3,
    createdAt: '2026-01-17T09:00:00.000Z',
    updatedAt: '2026-01-17T09:00:00.000Z',
  },
  {
    id: 'note-3',
    bookId: book.id,
    kind: 'insight',
    title: 'Свобода',
    body: 'Мысль про <script>alert("x")</script> и свободу.',
    tags: ['мотивация', 'психология'],
    order: 1,
    createdAt: '2026-01-18T09:00:00.000Z',
    updatedAt: '2026-01-18T09:00:00.000Z',
  },
]

const link: BookLink = {
  id: 'link-1',
  bookId: book.id,
  targetTitle: 'Другая книга',
  kind: 'similar',
  note: 'Та же атмосфера.',
  createdAt: '2026-01-19T09:00:00.000Z',
  updatedAt: '2026-01-19T09:00:00.000Z',
}

const data = {
  book,
  quotes: [privateQuote, publicQuote],
  characters: [character],
  notes,
  links: [link],
}

function sectionIndexes(markdown: string): number[] {
  return ['## Обзор', '## Цитаты', '## Персонажи', '## Сюжет', '## Мысли'].map((title) =>
    markdown.indexOf(title),
  )
}

describe('buildDiaryMarkdown', () => {
  it('writes sections in template order and includes all records', () => {
    const markdown = buildDiaryMarkdown(data)

    const indexes = sectionIndexes(markdown)
    expect(indexes.every((index) => index >= 0)).toBe(true)
    expect([...indexes].sort((a, b) => a - b)).toEqual(indexes)

    expect(markdown).toContain('# Мастер и Маргарита')
    expect(markdown).toContain('4,5 из 5')
    expect(markdown).toContain('13 дней')
    expect(markdown).toContain('> Рукописи не горят.')
    expect(markdown).toContain('> — с. 42 · Глава 7')
    expect(markdown).toContain('Личная цитата')
    expect(markdown).toContain('(спойлер) Приносит хаос')
    expect(markdown.indexOf('### Глава 2')).toBeLessThan(markdown.indexOf('### Глава 10'))
    expect(markdown).toContain('#мотивация #психология')
    // «Аналитик» не показывает секцию связей.
    expect(markdown).not.toContain('## Связи')
  })

  it('follows the bookclub template and includes links', () => {
    const markdown = buildDiaryMarkdown({
      ...data,
      book: { ...book, diaryTemplate: 'bookclub' },
    })

    expect(markdown).toContain('## Связи')
    expect(markdown).toContain('**Другая книга** — Похожая книга. Та же атмосфера.')
    expect(markdown).not.toContain('## Персонажи')
  })

  it('keeps only shareable records in the public export', () => {
    const markdown = buildDiaryMarkdown(data, 'public')

    expect(markdown).toContain('Рукописи не горят.')
    expect(markdown).not.toContain('Личная цитата')
    expect(markdown).not.toContain('Воланд')
    expect(markdown).not.toContain('Ранняя сцена')
    expect(markdown).not.toContain('Свобода')
    expect(markdown).not.toContain('Другая книга')
    // Книга без флага shareable не показывает личный обзор.
    expect(markdown).not.toContain('Оценка')
    expect(markdown).not.toContain('Дней чтения')
  })

  it('includes the book overview for others when the book is shareable', () => {
    const markdown = buildDiaryMarkdown({ ...data, book: { ...book, shareable: true } }, 'public')

    expect(markdown).toContain('## Обзор')
    expect(markdown).toContain('Оценка')
    expect(markdown).not.toContain('Воланд')
  })

  it('escapes HTML from user text', () => {
    const markdown = buildDiaryMarkdown(data)

    expect(markdown).not.toContain('<script>')
    expect(markdown).toContain('&lt;script&gt;')
  })

  it('explains an empty public export instead of leaking personal data', () => {
    const markdown = buildDiaryMarkdown(
      {
        book,
        quotes: [privateQuote],
        characters: [character],
        notes,
        links: [link],
      },
      'public',
    )

    expect(markdown).toContain('нет записей с пометкой «можно делиться»')
    expect(markdown).not.toContain('Личная цитата')
  })

  it('returns only sections that have data', () => {
    const sections = diaryExportSections(
      { ...data, quotes: [], characters: [], notes: [], links: [] },
      'full',
    )

    expect(sections.map((section) => section.id)).toEqual(['overview'])
  })

  it('matches the stable snapshot', () => {
    expect(buildDiaryMarkdown(data)).toMatchSnapshot()
  })
})
