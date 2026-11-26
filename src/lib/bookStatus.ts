import type { BookStatus } from '@/db/types'

export const BOOK_STATUSES: BookStatus[] = ['reading', 'want', 'finished', 'dnf']

export const STATUS_LABELS: Record<BookStatus, string> = {
  want: 'Хочу прочитать',
  reading: 'Читаю',
  finished: 'Прочитано',
  dnf: 'Не дочитал',
}

export const SHELF_TITLES: Record<BookStatus, string> = {
  want: 'Хочу прочитать',
  reading: 'Читаю',
  finished: 'Прочитано',
  dnf: 'Не дочитал',
}

export function isBookStatus(value: string | undefined): value is BookStatus {
  return value !== undefined && BOOK_STATUSES.includes(value as BookStatus)
}
