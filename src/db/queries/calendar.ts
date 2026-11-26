import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { monthBounds, parseDay, today } from '@/lib/dates'
import { db } from '../db'
import type { ID, ISODate, Session } from '../types'

export type CalendarDay = {
  day: ISODate
  minutes: number
  pages: number
  bookIds: ID[]
}

export type CalendarMonth = {
  start: ISODate
  end: ISODate
  days: Map<ISODate, CalendarDay>
}

/** Собирает карту активных дней месяца из уже загруженных сессий. */
export function summarizeCalendar(
  sessions: Session[],
  range: { start: ISODate; end: ISODate },
): CalendarMonth {
  const days = new Map<ISODate, CalendarDay>()

  for (const session of sessions) {
    if (session.day < range.start || session.day > range.end) continue

    const entry = days.get(session.day) ?? {
      day: session.day,
      minutes: 0,
      pages: 0,
      bookIds: [],
    }

    entry.minutes += session.durationMs
    entry.pages += session.pagesRead
    if (!entry.bookIds.includes(session.bookId)) entry.bookIds.push(session.bookId)
    days.set(session.day, entry)
  }

  for (const entry of days.values()) {
    entry.minutes = Math.round(entry.minutes / 60_000)
  }

  return { start: range.start, end: range.end, days }
}

export async function getCalendarMonth(anchor: ISODate): Promise<CalendarMonth> {
  const range = monthBounds(anchor)
  const sessions = await db.sessions
    .where('day')
    .between(range.start, range.end, true, true)
    .toArray()

  return summarizeCalendar(sessions, range)
}

/** `2026-11-26` → `2026-11`. */
export function monthKey(day: ISODate): string {
  return day.slice(0, 7)
}

/** `2026-11` → `2026-11-01`. */
export function monthAnchor(month: string): ISODate {
  return `${month}-01`
}

export function isMonthKey(value: string | null | undefined): value is string {
  return Boolean(value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value))
}

export function normalizeMonth(
  value: string | null | undefined,
  fallback: ISODate = today(),
): string {
  return isMonthKey(value) ? value : monthKey(fallback)
}

export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(year ?? 1970, (monthNumber ?? 1) - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(month: string): string {
  const label = format(parseDay(monthAnchor(month)), 'LLLL yyyy', { locale: ru })
  return label.charAt(0).toUpperCase() + label.slice(1)
}
