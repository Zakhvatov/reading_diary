import type {
  Book,
  BookFormat,
  BookLink,
  BookLinkKind,
  BookNote,
  BookStatus,
  Character,
  Quote,
} from '@/db/types'
import { formatDay } from '@/lib/dates'
import { daysRead } from '@/lib/days'
import { pluralRu } from '@/lib/format'
import { formatRating } from '@/lib/rating'
import { DIARY_SECTION_LABELS, sectionsFor, type DiarySection } from '@/lib/templates'

export type ExportMode = 'full' | 'public'

export type DiaryExportData = {
  book: Book
  quotes: Quote[]
  characters: Character[]
  notes: BookNote[]
  links: BookLink[]
}

export type DiaryExportSection = {
  id: DiarySection
  title: string
  body: string
}

export type MetadataRow = { label: string; value: string }

export const BOOK_STATUS_LABELS: Record<BookStatus, string> = {
  want: 'Хочу прочитать',
  reading: 'Читаю',
  rereading: 'Перечитываю',
  finished: 'Прочитано',
  dnf: 'Брошено',
}

export const BOOK_FORMAT_LABELS: Record<BookFormat, string> = {
  paper: 'Бумага',
  ebook: 'Электронная',
  audio: 'Аудио',
}

export const LINK_KIND_LABELS: Record<BookLinkKind, string> = {
  similar: 'Похожая книга',
  sequel: 'Продолжение',
  prequel: 'Приквел',
  'same-world': 'Тот же мир',
  other: 'Связь',
}

const ACQUISITION_LABELS: Record<NonNullable<Book['acquisition']>, string> = {
  bought: 'Куплена',
  library: 'Библиотека',
  gift: 'Подарок',
  other: 'Другое',
}

/** Текст пользователя не должен исполняться как HTML в Markdown-просмотрщиках. */
function safe(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function quoteAttribution(quote: Pick<Quote, 'page' | 'chapter'>): string {
  const parts: string[] = []
  if (quote.page) parts.push(`с. ${quote.page}`)
  if (quote.chapter) parts.push(quote.chapter)
  return parts.join(' · ')
}

/** Строки обзора книги — общие для Markdown и печатной версии. */
export function bookMetadataRows(book: Book): MetadataRow[] {
  const rows: MetadataRow[] = [{ label: 'Статус', value: BOOK_STATUS_LABELS[book.status] }]

  if (book.rating !== undefined || (book.ratingScale === 'emotion' && book.emotion)) {
    rows.push({
      label: 'Оценка',
      value: formatRating(book.rating, book.ratingScale, book.emotion),
    })
  }

  const dates: string[] = []
  if (book.startedAt && book.finishedAt) {
    dates.push(`${formatDay(book.startedAt)} — ${formatDay(book.finishedAt)}`)
  } else if (book.startedAt) {
    dates.push(`с ${formatDay(book.startedAt)}`)
  } else if (book.finishedAt) {
    dates.push(`закончено ${formatDay(book.finishedAt)}`)
  }
  if (dates.length > 0) rows.push({ label: 'Даты', value: dates.join(', ') })

  const days = daysRead(book.startedAt, book.finishedAt)
  if (days !== undefined) {
    rows.push({ label: 'Дней чтения', value: `${days} ${pluralRu(days, ['день', 'дня', 'дней'])}` })
  }

  if (book.format) rows.push({ label: 'Формат', value: BOOK_FORMAT_LABELS[book.format] })
  if (book.acquisition) {
    rows.push({ label: 'Источник', value: ACQUISITION_LABELS[book.acquisition] })
  }
  if (book.genres.length > 0) rows.push({ label: 'Жанры', value: book.genres.join(', ') })
  if (book.tags.length > 0) {
    rows.push({ label: 'Теги', value: book.tags.map((tag) => `#${tag}`).join(' ') })
  }
  if (book.moods.length > 0) {
    rows.push({ label: 'Настроения', value: book.moods.map((mood) => `#${mood}`).join(' ') })
  }
  if (book.publisher) rows.push({ label: 'Издательство', value: book.publisher })
  if (book.publishedYear) rows.push({ label: 'Год', value: String(book.publishedYear) })
  if (book.pageCount) rows.push({ label: 'Страниц', value: String(book.pageCount) })
  if (book.isbn13) rows.push({ label: 'ISBN', value: book.isbn13 })

  return rows
}

function overviewBody(book: Book): string {
  return bookMetadataRows(book)
    .map((row) => `- ${row.label}: ${safe(row.value)}`)
    .join('\n')
}

function quotesBody(quotes: Quote[]): string {
  return [...quotes]
    .filter((quote) => quote.text.trim())
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((quote) => {
      const quoted = safe(quote.text)
        .split('\n')
        .map((line) => (line ? `> ${line}` : '>'))
        .join('\n')
      const parts = [quoted]
      const meta = quoteAttribution(quote)
      if (meta) parts.push('>', `> — ${safe(meta)}`)
      if (quote.note) parts.push('', `Заметка: ${safe(quote.note)}`)
      return parts.join('\n')
    })
    .join('\n\n')
}

function charactersBody(characters: Character[]): string {
  return [...characters]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((character) => {
      const heading = character.role
        ? `### ${safe(character.name)} — ${safe(character.role)}`
        : `### ${safe(character.name)}`
      const note = character.spoiler ? `(спойлер) ${safe(character.note)}` : safe(character.note)
      return note ? `${heading}\n\n${note}` : heading
    })
    .join('\n\n')
}

function plotBody(notes: BookNote[]): string {
  const plotNotes = notes
    .filter((note) => note.kind === 'plot' && note.body.trim())
    .sort(
      (a, b) =>
        (a.chapter ?? '').localeCompare(b.chapter ?? '', 'ru', { numeric: true }) ||
        a.order - b.order ||
        a.createdAt.localeCompare(b.createdAt),
    )

  const groups = new Map<string, BookNote[]>()
  for (const note of plotNotes) {
    const chapter = note.chapter ?? ''
    groups.set(chapter, [...(groups.get(chapter) ?? []), note])
  }

  return [...groups.entries()]
    .map(([chapter, group]) => {
      const body = group.map((note) => safe(note.body.trim())).join('\n\n')
      return chapter ? `### ${safe(chapter)}\n\n${body}` : body
    })
    .join('\n\n')
}

function insightsBody(notes: BookNote[]): string {
  return notes
    .filter((note) => note.kind === 'insight' && note.body.trim())
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt))
    .map((note) => {
      const parts: string[] = []
      if (note.title) parts.push(`### ${safe(note.title)}`)
      parts.push(safe(note.body.trim()))
      if (note.tags.length > 0) {
        parts.push(note.tags.map((tag) => `#${safe(tag)}`).join(' '))
      }
      return parts.join('\n\n')
    })
    .join('\n\n')
}

function linksBody(links: BookLink[]): string {
  return [...links]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((link) => {
      const note = link.note ? ` ${safe(link.note)}` : ''
      return `- **${safe(link.targetTitle)}** — ${LINK_KIND_LABELS[link.kind]}.${note}`
    })
    .join('\n')
}

/**
 * Секции в порядке шаблона книги. В режиме «Для других» остаются только
 * записи с флагом `shareable`: обзор книги и цитаты. У персонажей, заметок
 * и связей такого флага нет, поэтому это всегда личная часть дневника.
 */
export function diaryExportSections(data: DiaryExportData, mode: ExportMode): DiaryExportSection[] {
  const { book } = data
  const personal = mode === 'full'

  return sectionsFor(book.diaryTemplate).flatMap((id) => {
    let body = ''

    if (id === 'overview') {
      body = mode === 'full' || book.shareable ? overviewBody(book) : ''
    } else if (id === 'quotes') {
      body = quotesBody(personal ? data.quotes : data.quotes.filter((quote) => quote.shareable))
    } else if (id === 'characters') {
      body = personal ? charactersBody(data.characters) : ''
    } else if (id === 'plot') {
      body = personal ? plotBody(data.notes) : ''
    } else if (id === 'insights') {
      body = personal ? insightsBody(data.notes) : ''
    } else if (id === 'links') {
      body = personal ? linksBody(data.links) : ''
    }

    return body.trim() ? [{ id, title: DIARY_SECTION_LABELS[id], body }] : []
  })
}

export function buildDiaryMarkdown(data: DiaryExportData, mode: ExportMode = 'full'): string {
  const { book } = data
  const sections = diaryExportSections(data, mode)

  const header = [`# ${safe(book.title)}`]
  if (book.subtitle) header.push(`*${safe(book.subtitle)}*`)
  if (book.authors.length > 0) header.push(book.authors.map(safe).join(', '))

  const blocks = [header.join('\n\n')]

  for (const section of sections) {
    blocks.push(`## ${section.title}\n\n${section.body}`)
  }

  if (blocks.length === 1) {
    blocks.push('_В этом экспорте нет записей с пометкой «можно делиться»._')
  }

  return `${blocks.join('\n\n')}\n`
}

export function diaryMarkdownFileName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

  return `дневник-${slug || 'книга'}.md`
}
