import {
  addDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns'
import type { ISODate } from '@/db/types'

export function toDay(date: Date): ISODate {
  return format(date, 'yyyy-MM-dd')
}

export function today(): ISODate {
  return toDay(new Date())
}

export function parseDay(day: ISODate): Date {
  const [year, month, dayOfMonth] = day.split('-').map(Number)
  return new Date(year ?? 1970, (month ?? 1) - 1, dayOfMonth ?? 1)
}

export function weekDays(day: ISODate): ISODate[] {
  const start = startOfWeek(parseDay(day), { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return toDay(date)
  })
}

export function monthDays(day: ISODate): ISODate[] {
  const start = startOfMonth(parseDay(day))
  const end = endOfMonth(start)
  const days: ISODate[] = []

  for (let date = start; date <= end; date = addDays(date, 1)) {
    days.push(toDay(date))
  }

  return days
}

export function weekBounds(day: ISODate): { start: ISODate; end: ISODate } {
  const date = parseDay(day)
  return {
    start: toDay(startOfWeek(date, { weekStartsOn: 1 })),
    end: toDay(endOfWeek(date, { weekStartsOn: 1 })),
  }
}

export function monthBounds(day: ISODate): { start: ISODate; end: ISODate } {
  const date = parseDay(day)
  return { start: toDay(startOfMonth(date)), end: toDay(endOfMonth(date)) }
}

export function yearBounds(day: ISODate): { start: ISODate; end: ISODate } {
  const date = parseDay(day)
  return { start: toDay(startOfYear(date)), end: toDay(endOfYear(date)) }
}
