import { Link } from 'react-router-dom'
import { bookProgress } from '@/lib/progress'
import { formatAuthors } from '@/lib/authors'
import type { Book } from '@/db/types'
import { SpineProgress } from '@/components/ui/SpineProgress'
import { BookCover } from './BookCover'

type BookCardProps = {
  book: Book
}

export function BookCard({ book }: BookCardProps) {
  const progress = bookProgress(book)

  return (
    <Link to={`/books/${book.id}`} className="group block">
      <BookCover book={book} />
      <h3 className="mt-2 line-clamp-2 font-display text-[16px] leading-[21px] font-medium">
        {book.title}
      </h3>
      <p className="mt-0.5 line-clamp-1 text-[13px] leading-[18px] text-muted">
        {formatAuthors(book.authors, true)}
      </p>
      <SpineProgress value={progress} className="mt-2" />
    </Link>
  )
}
