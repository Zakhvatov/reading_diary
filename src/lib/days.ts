import { differenceInCalendarDays } from 'date-fns'
import type { ISODate } from '@/db/types'
import { parseDay } from '@/lib/dates'

/**
 * Сколько календарных дней заняло чтение, включительно.
 * Без даты окончания считается до сегодняшнего дня.
 */
export function daysRead(
  startedAt?: ISODate,
  finishedAt?: ISODate,
  now: Date = new Date(),
): number | undefined {
  if (!startedAt) return undefined

  const start = parseDay(startedAt)
  const end = finishedAt ? parseDay(finishedAt) : now
  const days = differenceInCalendarDays(end, start) + 1

  return Math.max(days, 1)
}
