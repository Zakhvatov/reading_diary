import { Books, Plus } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { BookGrid } from '@/components/book/BookGrid'
import { STATUS_TONE } from '@/components/book/statusTone'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { useBooks } from '@/db/live'
import type { Book, BookStatus } from '@/db/types'
import { BOOK_STATUSES, isBookStatus, shelfOf, SHELF_TITLES, STATUS_SHORT } from '@/lib/bookStatus'
import { pluralRu } from '@/lib/format'

type SortKey = 'recent' | 'title' | 'author'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'recent', label: 'Недавние' },
  { value: 'title', label: 'Название' },
  { value: 'author', label: 'Автор' },
]

const SKELETON_KEYS = ['a', 'b', 'c']

function bookCount(count: number): string {
  return `${count} ${pluralRu(count, ['книга', 'книги', 'книг'])}`
}

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
  const allBooks = useBooks()
  const books = allBooks?.filter((book) => shelfOf(book.status) === status)
  const [sort, setSort] = useState<SortKey>('recent')

  if (!status) {
    return <Navigate to="/shelves" replace />
  }

  return (
    <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
      <ScreenHeader
        title={SHELF_TITLES[status]}
        caption="Библиотека"
        back
        captionClassName={STATUS_TONE[status].caption}
        action={
          <Link
            to={`/add?status=${status}`}
            aria-label={`Добавить книгу на полку «${SHELF_TITLES[status]}»`}
            className="flex size-11 items-center justify-center rounded-full border border-line bg-surface text-ink active:bg-accent-soft"
          >
            <Plus size={20} aria-hidden />
          </Link>
        }
      />

      <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
        {BOOK_STATUSES.map((option) => {
          const active = option === status
          return (
            <Link
              key={option}
              to={`/shelves/${option}`}
              aria-current={active ? 'page' : undefined}
              className={[
                'inline-flex h-11 shrink-0 items-center rounded-[var(--radius-pill)] px-4 text-[13px] font-medium',
                active ? STATUS_TONE[option].chip : 'border border-line bg-surface text-muted',
              ].join(' ')}
            >
              {STATUS_SHORT[option]}
            </Link>
          )
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span
          className={`inline-flex h-7 shrink-0 items-center rounded-[var(--radius-pill)] px-3 text-[12px] leading-none font-medium ${STATUS_TONE[status].chip}`}
        >
          {books === undefined ? '…' : bookCount(books.length)}
        </span>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as SortKey)}
          aria-label="Сортировка"
          className="h-11 rounded-[var(--radius-control)] border border-line bg-surface px-3 text-[16px] text-ink focus-visible:border-accent focus-visible:outline-none"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {books === undefined ? (
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-7" aria-hidden>
          {SKELETON_KEYS.map((key) => (
            <div key={key} className="animate-pulse">
              <div className="aspect-[2/3] rounded-[6px] bg-line/60" />
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
            tone={STATUS_TONE[status].tone}
            action={<Button to={`/add?status=${status}`}>Добавить книгу</Button>}
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
