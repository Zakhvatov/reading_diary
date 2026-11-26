import { Books } from '@phosphor-icons/react'
import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { BookGrid } from '@/components/book/BookGrid'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { useBooks } from '@/db/live'
import type { Book, BookStatus } from '@/db/types'
import { isBookStatus, SHELF_TITLES } from '@/lib/bookStatus'

type SortKey = 'recent' | 'title' | 'author'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'recent', label: 'Сначала недавние' },
  { value: 'title', label: 'По названию' },
  { value: 'author', label: 'По автору' },
]

const SKELETON_KEYS = ['a', 'b', 'c']

function sortBooks(books: Book[], sort: SortKey): Book[] {
  if (sort === 'recent') {
    return [...books].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  const value = (book: Book) => (sort === 'title' ? book.title : book.authors.join(', '))

  return [...books].sort((a, b) => value(a).localeCompare(value(b), 'ru'))
}

export function ShelfDetailScreen() {
  const { shelf } = useParams()
  const status: BookStatus | undefined = isBookStatus(shelf) ? shelf : undefined
  const books = useBooks(status)
  const [sort, setSort] = useState<SortKey>('recent')

  if (!status) {
    return <Navigate to="/shelves" replace />
  }

  return (
    <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
      <ScreenHeader title={SHELF_TITLES[status]} caption="Библиотека" back />

      <select
        value={sort}
        onChange={(event) => setSort(event.target.value as SortKey)}
        aria-label="Сортировка"
        className="mt-6 h-11 rounded-[var(--radius-control)] border border-line bg-surface px-3 text-[15px] text-ink focus-visible:border-accent focus-visible:outline-none"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {books === undefined ? (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-6" aria-hidden>
          {SKELETON_KEYS.map((key) => (
            <div key={key} className="animate-pulse">
              <div className="aspect-[2/3] rounded-[10px] bg-line/60" />
              <div className="mt-2 h-4 w-3/4 rounded bg-line/60" />
              <div className="mt-2 h-3 w-1/2 rounded bg-line/60" />
            </div>
          ))}
        </div>
      ) : null}

      {books !== undefined && books.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<Books size={28} />}
            title="На полке пусто"
            description="Книги этого статуса появятся здесь."
            action={<Button to="/add">Добавить книгу</Button>}
          />
        </div>
      ) : null}

      {books !== undefined && books.length > 0 ? (
        <div className="mt-6">
          <BookGrid books={sortBooks(books, sort)} />
        </div>
      ) : null}
    </div>
  )
}
