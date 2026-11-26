import { differenceInCalendarDays } from 'date-fns'
import { parseDay, toDay, today } from '@/lib/dates'
import { db } from '../db'
import type { ISODate, Session } from '../types'

export const STREAK_MIN_DURATION_MS = 60_000

export type StreakDay = { day: ISODate; active: boolean }

export type StreakInfo = {
  current: number
  longest: number
  /** Последние 7 дней, от самого раннего к сегодняшнему. */
  last7: StreakDay[]
  /** Была ли сессия сегодня. */
  extendedToday: boolean
}

/** День засчитывается в стрик при минуте времени или хотя бы одной странице. */
export function isStreakSession(session: Pick<Session, 'durationMs' | 'pagesRead'>): boolean {
  return session.durationMs >= STREAK_MIN_DURATION_MS || session.pagesRead > 0
}

function shiftDay(day: ISODate, delta: number): ISODate {
  const date = parseDay(day)
  date.setDate(date.getDate() + delta)
  return toDay(date)
}

export function computeStreak(
  activeDays: Iterable<ISODate>,
  reference: ISODate = today(),
): StreakInfo {
  const days = new Set(activeDays)
  const extendedToday = days.has(reference)

  let cursor = reference
  if (!extendedToday) {
    const yesterday = shiftDay(reference, -1)
    if (days.has(yesterday)) {
      cursor = yesterday
    } else {
      return {
        current: 0,
        longest: longestStreak(days),
        last7: lastSeven(days, reference),
        extendedToday,
      }
    }
  }

  let current = 0
  while (days.has(cursor)) {
    current += 1
    cursor = shiftDay(cursor, -1)
  }

  return { current, longest: longestStreak(days), last7: lastSeven(days, reference), extendedToday }
}

function longestStreak(days: Set<ISODate>): number {
  const sorted = [...days].sort()
  let longest = 0
  let run = 0
  let previous: ISODate | undefined

  for (const day of sorted) {
    run =
      previous && differenceInCalendarDays(parseDay(day), parseDay(previous)) === 1 ? run + 1 : 1
    previous = day
    if (run > longest) longest = run
  }

  return longest
}

function lastSeven(days: Set<ISODate>, reference: ISODate): StreakDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const day = shiftDay(reference, index - 6)
    return { day, active: days.has(day) }
  })
}

export async function getStreak(reference: ISODate = today()): Promise<StreakInfo> {
  const sessions = await db.sessions.toArray()
  const activeDays = new Set(
    sessions.filter((session) => isStreakSession(session)).map((session) => session.day),
  )

  return computeStreak(activeDays, reference)
}
