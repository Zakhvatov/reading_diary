import { BookOpen, CaretRight, MagnifyingGlass } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookGrid } from '@/components/book/BookGrid'
import { STATUS_TONE } from '@/components/book/statusTone'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { useBooks } from '@/db/live'
import type { Book, BookStatus } from '@/db/types'
import { BOOK_STATUSES, SHELF_TITLES, shelfOf } from '@/lib/bookStatus'
import { pluralRu } from '@/lib/format'
import { normalizeText } from '@/lib/text'

const SKELETON_KEYS = ['a', 'b', 'c']

function bookCount(count: number): string {
  return `${count} ${pluralRu(count, ['книга', 'книги', 'книг'])}`
}

function matchesQuery(book: Book, query: string): boolean {
  return normalizeText([book.title, ...book.authors].join(' ')).includes(query)
}

function SkeletonGrid() {
  return (
    <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-7" aria-hidden>
      {SKELETON_KEYS.map((key) => (
        <div key={key} className="animate-pulse">
          <div className="aspect-[2/3] rounded-[6px] bg-line/60" />
          <div className="mt-2 h-4 w-3/4 rounded bg-line/60" />
          <div className="mt-2 h-3 w-1/2 rounded bg-line/60" />
        </div>
      ))}
    </div>
  )
}

function ShelfRow({ status, books }: { status: BookStatus; books: Book[] }) {
  const count = books.length

  return (
    <Link
      to={`/shelves/${status}`}
      className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface px-4 py-3.5 active:bg-accent-soft/40"
    >
      <span className={`size-2.5 shrink-0 rounded-full ${STATUS_TONE[status].dot}`} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] leading-[22px] font-medium text-ink">
          {SHELF_TITLES[status]}
        </span>
        <span className="mt-0.5 block text-[12px] leading-[16px] text-muted">
          {count > 0 ? bookCount(count) : 'Пусто'}
        </span>
      </span>
      <CaretRight size={16} className="shrink-0 text-muted" aria-hidden />
    </Link>
  )
}

export function ShelvesScreen() {
  const books = useBooks()
  const allBooks = books ?? []
  const [query, setQuery] = useState('')
  const search = normalizeText(query)
  const hasSearch = search.length > 0
  const hasBooks = allBooks.length > 0
  const found = hasSearch ? allBooks.filter((book) => matchesQuery(book, search)) : []

  return (
    <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
      <ScreenHeader title="Библиотека" />

      <div className="relative mt-5">
        <MagnifyingGlass
          size={18}
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Поиск по библиотеке"
          placeholder="Название или автор"
          className="h-12 w-full rounded-[var(--radius-pill)] border border-line bg-surface pr-4 pl-11 text-[16px] text-ink placeholder:text-muted focus-visible:border-accent focus-visible:outline-none"
        />
      </div>

      {books === undefined ? <SkeletonGrid /> : null}

      {books !== undefined && !hasBooks ? (
        <div className="mt-6">
          <EmptyState
            icon={<BookOpen size={28} />}
            title="Библиотека пуста"
            description="Добавьте первую книгу — она появится на нужной полке."
            action={<Button to="/add">Добавить книгу</Button>}
          />
        </div>
      ) : null}

      {hasBooks && hasSearch ? (
        <section className="mt-7">
          <div className="flex items-baseline gap-2">
            <h2 className="font-display text-[21px] leading-[27px] font-medium">Найдено</h2>
            <span className="text-[13px] leading-[18px] text-muted">{bookCount(found.length)}</span>
          </div>
          {found.length > 0 ? (
            <div className="mt-3">
              <BookGrid books={found} />
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-muted">Ничего не найдено</p>
              <Button variant="outline" className="mt-4" onClick={() => setQuery('')}>
                Очистить поиск
              </Button>
            </div>
          )}
        </section>
      ) : null}

      {hasBooks && !hasSearch ? (
        <>
          <section className="mt-7" aria-labelledby="shelves-title">
            <h2
              id="shelves-title"
              className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"
            >
              Полки
            </h2>
            <div className="mt-2.5 flex flex-col gap-2">
              {BOOK_STATUSES.map((status) => (
                <ShelfRow
                  key={status}
                  status={status}
                  books={allBooks.filter((book) => shelfOf(book.status) === status)}
                />
              ))}
            </div>
          </section>

          <section className="mt-8" aria-labelledby="all-books-title">
            <div className="flex items-baseline justify-between gap-3">
              <h2
                id="all-books-title"
                className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"
              >
                Все книги
              </h2>
              <span className="text-[12px] leading-[16px] text-muted tabular-nums">
                {allBooks.length}
              </span>
            </div>
            <div className="mt-3">
              <BookGrid books={allBooks} />
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
