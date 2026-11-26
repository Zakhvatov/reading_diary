import type { BookStatus } from '@/db/types'

export const BOOK_STATUSES: BookStatus[] = ['reading', 'want', 'finished', 'dnf']

/** Все варианты для шторки статуса: полка «Читаю» включает перечитывание. */
export const STATUS_OPTIONS: BookStatus[] = ['reading', 'rereading', 'finished', 'want', 'dnf']

export function shelfOf(status: BookStatus): BookStatus {
  return status === 'rereading' ? 'reading' : status
}

export const STATUS_LABELS: Record<BookStatus, string> = {
  want: 'Хочу прочитать',
  reading: 'Читаю',
  finished: 'Прочитано',
  dnf: 'Не дочитал',
  rereading: 'Перечитываю',
}

export const SHELF_TITLES: Record<BookStatus, string> = {
  want: 'Хочу прочитать',
  reading: 'Читаю',
  finished: 'Прочитано',
  dnf: 'Не дочитал',
  rereading: 'Перечитываю',
}

export const STATUS_SHORT: Record<BookStatus, string> = {
  want: 'Хочу',
  reading: 'Читаю',
  finished: 'Прочитано',
  dnf: 'Не дочитал',
  rereading: 'Перечитываю',
}

export function isBookStatus(value: string | undefined): value is BookStatus {
  return value !== undefined && BOOK_STATUSES.includes(value as BookStatus)
}
