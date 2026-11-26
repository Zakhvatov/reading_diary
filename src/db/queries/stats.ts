import { parseDay, toDay, weekBounds } from '@/lib/dates'
import { db } from '../db'
import type { Book, ID, ISODate, Session } from '../types'

export type StatsRange = { start: ISODate; end: ISODate }

export type StatsDay = {
  day: ISODate
  minutes: number
  pages: number
  sessions: number
}

export type StatsBreakdown = {
  key: string
  label: string
  minutes: number
  pages: number
  sessions: number
  /** Доля по минутам, 0…1. */
  share: number
}

export type StatsBook = StatsBreakdown & { bookId: ID }

export type StatsSummary = StatsRange & {
  minutes: number
  pages: number
  sessions: number
  books: number
  series: StatsDay[]
  byBook: StatsBook[]
  byGenre: StatsBreakdown[]
  byFormat: StatsBreakdown[]
}

type Accumulator = { minutesMs: number; pages: number; sessions: number }

type BookWithFormat = Book & { format?: string }

const FORMAT_LABELS: Record<string, string> = {
  paper: 'Бумага',
  ebook: 'Электронная',
  audio: 'Аудио',
}

const UNKNOWN_BOOK = 'Книга удалена'

function emptyAccumulator(): Accumulator {
  return { minutesMs: 0, pages: 0, sessions: 0 }
}

function toMinutes(ms: number): number {
  return Math.round(ms / 60_000)
}

function eachDay(start: ISODate, end: ISODate): ISODate[] {
  const days: ISODate[] = []
  const cursor = parseDay(start)
  const last = parseDay(end)

  while (cursor <= last) {
    days.push(toDay(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return days
}

function addTo(map: Map<string, Accumulator>, key: string, session: Session): void {
  const acc = map.get(key) ?? emptyAccumulator()
  acc.minutesMs += session.durationMs
  acc.pages += session.pagesRead
  acc.sessions += 1
  map.set(key, acc)
}

function formatOf(book: Book | undefined): string | null {
  const format = (book as BookWithFormat | undefined)?.format
  return format ? format : null
}

function toBreakdowns(
  map: Map<string, Accumulator>,
  totalMs: number,
  labelOf: (key: string) => string,
): StatsBreakdown[] {
  return [...map.entries()]
    .map(([key, acc]) => ({
      key,
      label: labelOf(key),
      minutes: toMinutes(acc.minutesMs),
      pages: acc.pages,
      sessions: acc.sessions,
      share: totalMs > 0 ? acc.minutesMs / totalMs : 0,
    }))
    .sort((a, b) => b.minutes - a.minutes || a.label.localeCompare(b.label, 'ru'))
}

function sumMinutes(map: Map<string, Accumulator>): number {
  let total = 0
  for (const acc of map.values()) total += acc.minutesMs
  return total
}

/**
 * Один проход по сессиям диапазона: итоги, серия по дням,
 * разбивка по книгам, жанрам и формату (если поле заполнено).
 */
export function summarizeSessions(
  sessions: Session[],
  books: Book[],
  range: StatsRange,
): StatsSummary {
  const bookMap = new Map(books.map((book) => [book.id, book]))
  const inRange = sessions.filter(
    (session) => session.day >= range.start && session.day <= range.end,
  )

  const series = new Map<ISODate, Accumulator>()
  for (const day of eachDay(range.start, range.end)) series.set(day, emptyAccumulator())

  const byBookAcc = new Map<ID, Accumulator>()
  const byGenreAcc = new Map<string, Accumulator>()
  const byFormatAcc = new Map<string, Accumulator>()

  let totalMs = 0
  let pages = 0

  for (const session of inRange) {
    totalMs += session.durationMs
    pages += session.pagesRead

    addTo(series, session.day, session)
    addTo(byBookAcc, session.bookId, session)

    const book = bookMap.get(session.bookId)
    for (const genre of book?.genres ?? []) addTo(byGenreAcc, genre, session)

    const format = formatOf(book)
    if (format) addTo(byFormatAcc, format, session)
  }

  const byBook: StatsBook[] = [...byBookAcc.entries()]
    .map(([bookId, acc]) => ({
      key: bookId,
      bookId,
      label: bookMap.get(bookId)?.title ?? UNKNOWN_BOOK,
      minutes: toMinutes(acc.minutesMs),
      pages: acc.pages,
      sessions: acc.sessions,
      share: totalMs > 0 ? acc.minutesMs / totalMs : 0,
    }))
    .sort((a, b) => b.minutes - a.minutes || a.label.localeCompare(b.label, 'ru'))

  return {
    start: range.start,
    end: range.end,
    minutes: toMinutes(totalMs),
    pages,
    sessions: inRange.length,
    books: byBookAcc.size,
    series: [...series.entries()].map(([day, acc]) => ({
      day,
      minutes: toMinutes(acc.minutesMs),
      pages: acc.pages,
      sessions: acc.sessions,
    })),
    byBook,
    byGenre: toBreakdowns(byGenreAcc, sumMinutes(byGenreAcc), (key) => key),
    byFormat: toBreakdowns(
      byFormatAcc,
      sumMinutes(byFormatAcc),
      (key) => FORMAT_LABELS[key] ?? key,
    ),
  }
}

export async function getStats(start: ISODate, end: ISODate): Promise<StatsSummary> {
  const sessions = await db.sessions.where('day').between(start, end, true, true).toArray()
  const bookIds = [...new Set(sessions.map((session) => session.bookId))]
  const books = (await db.books.bulkGet(bookIds)).filter((book): book is Book => Boolean(book))

  return summarizeSessions(sessions, books, { start, end })
}

/** Сворачивает дневную серию в недельные корзины (пн–вс) для годового графика. */
export function toWeeklySeries(series: StatsDay[]): StatsDay[] {
  const buckets = new Map<ISODate, StatsDay>()

  for (const point of series) {
    const { start } = weekBounds(point.day)
    const bucket = buckets.get(start) ?? { day: start, minutes: 0, pages: 0, sessions: 0 }
    bucket.minutes += point.minutes
    bucket.pages += point.pages
    bucket.sessions += point.sessions
    buckets.set(start, bucket)
  }

  return [...buckets.values()].sort((a, b) => a.day.localeCompare(b.day))
}

/** Книги с датой завершения в указанном году. */
export async function countFinishedBooks(year: number): Promise<number> {
  return db.books.where('finishedAt').between(`${year}-01-01`, `${year}-12-31`, true, true).count()
}
