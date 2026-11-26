import { Link } from 'react-router-dom'
import { bookProgress } from '@/lib/progress'
import { formatAuthors } from '@/lib/authors'
import { formatDayShort } from '@/lib/dates'
import type { Book } from '@/db/types'
import { SpineProgress } from '@/components/ui/SpineProgress'
import { ColorLabelDot } from '@/components/diary/ColorLabelPicker'
import { BookCover } from './BookCover'
import { StatusChip } from './StatusChip'

type BookCardProps = {
  book: Book
}

function cardMeta(book: Book, progress: number): string | null {
  const percent = Math.round(progress * 100)

  if (book.status === 'finished') {
    return book.finishedAt ? `Прочитано ${formatDayShort(book.finishedAt)}` : 'Прочитано'
  }

  if (book.status === 'rereading') {
    return book.startedAt ? `Перечитываю с ${formatDayShort(book.startedAt)}` : 'Перечитываю'
  }

  if (book.status === 'reading') {
    if (book.pageCount) {
      return `${book.currentPage} из ${book.pageCount} · ${percent}%`
    }
    return `${percent}%`
  }

  if (book.pageCount) {
    return `${book.pageCount} стр.`
  }

  return null
}

export function BookCard({ book }: BookCardProps) {
  const progress = bookProgress(book)
  const meta = cardMeta(book, progress)

  return (
    <Link
      to={`/books/${book.id}`}
      className="group block rounded-[var(--radius-control)] focus-visible:outline-offset-4"
    >
      <div className="relative">
        <BookCover book={book} />
        {book.colorLabel !== 'none' ? (
          <ColorLabelDot
            label={book.colorLabel}
            className="absolute right-2 bottom-2 ring-2 ring-paper"
          />
        ) : null}
        <StatusChip status={book.status} size="sm" className="absolute top-2 right-2" />
      </div>
      <h3 className="mt-2.5 line-clamp-2 font-display text-[17px] leading-[22px] font-medium text-ink">
        {book.title}
      </h3>
      <p className="mt-1 line-clamp-1 text-[13px] leading-[18px] text-muted">
        {formatAuthors(book.authors, true)}
      </p>
      {meta ? (
        <p className="mt-1.5 text-[12px] leading-[16px] text-muted tabular-nums">{meta}</p>
      ) : null}
      {book.status === 'reading' ? <SpineProgress value={progress} className="mt-2" /> : null}
    </Link>
  )
}
