import type { Book, ISODate, Session } from '@/db/types'

function clamp(value: number): number {
  return Math.min(Math.max(value, 0), 1)
}

export function bookProgress(
  book: Pick<Book, 'progressMode' | 'currentPage' | 'pageCount' | 'percent'>,
): number {
  if (book.progressMode === 'percent') {
    return clamp(book.percent / 100)
  }

  if (!book.pageCount || book.pageCount <= 0) {
    return 0
  }

  return clamp(book.currentPage / book.pageCount)
}

export function applySessionProgress(
  book: Book,
  session: Pick<Session, 'endPage' | 'day'>,
): Partial<Book> {
  if (session.endPage === undefined || session.endPage <= book.currentPage) {
    return {}
  }

  const currentPage = Math.min(session.endPage, book.pageCount ?? session.endPage)
  const patch: Partial<Book> = {
    currentPage,
    startedAt: book.startedAt ?? session.day,
  }

  if (book.pageCount !== undefined && currentPage >= book.pageCount) {
    patch.status = 'finished'
    patch.finishedAt = session.day
    patch.percent = 100
  } else if (book.status === 'want' || book.status === 'dnf') {
    patch.status = 'reading'
  }

  return patch
}

export function finishBook(book: Book, day: ISODate): Partial<Book> {
  return {
    status: 'finished',
    currentPage: book.pageCount ?? book.currentPage,
    percent: 100,
    finishedAt: day,
    startedAt: book.startedAt ?? day,
  }
}

export function setBookStatus(book: Book, status: Book['status'], day: ISODate): Partial<Book> {
  if (status === 'finished') {
    return finishBook(book, day)
  }

  if (status === 'reading') {
    return {
      status,
      startedAt: day,
      finishedAt: undefined,
    }
  }

  return { status, finishedAt: undefined }
}
