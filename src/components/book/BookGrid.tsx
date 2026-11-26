import type { Book } from '@/db/types'
import { BookCard } from './BookCard'

type BookGridProps = {
  books: Book[]
}

export function BookGrid({ books }: BookGridProps) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-7">
      {books.map((book) => (
        <BookCard key={book.id} book={book} />
      ))}
    </div>
  )
}
