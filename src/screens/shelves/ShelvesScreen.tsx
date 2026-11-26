import { BookOpen, MagnifyingGlass } from '@phosphor-icons/react'
import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookGrid } from '@/components/book/BookGrid'
import { STATUS_TONE } from '@/components/book/statusTone'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { useBooks } from '@/db/live'
import type { Book, BookStatus } from '@/db/types'
import { BOOK_STATUSES, SHELF_TITLES, shelfOf, STATUS_SHORT } from '@/lib/bookStatus'
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
          <div className="aspect-[2/3] rounded-[10px] bg-line/60" />
          <div className="mt-2 h-4 w-3/4 rounded bg-line/60" />
          <div className="mt-2 h-3 w-1/2 rounded bg-line/60" />
        </div>
      ))}
    </div>
  )
}

function SummaryStrip({ books }: { books: Book[] }) {
  const rows = BOOK_STATUSES.map((status) => ({
    status,
    count: books.filter((book) => shelfOf(book.status) === status).length,
  })).filter((row) => row.status !== 'dnf' && row.count > 0)

  if (rows.length === 0) return null

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-0.5 rounded-[var(--radius-control)] border border-line bg-surface px-2 py-1">
      {rows.map(({ status, count }, index) => (
        <Fragment key={status}>
          {index > 0 ? (
            <span className="px-0.5 text-[12px] text-muted" aria-hidden>
              ·
            </span>
          ) : null}
          <Link
            to={`/shelves/${status}`}
            className="flex h-11 items-center gap-1.5 rounded-full px-2.5 active:bg-accent-soft"
          >
            <span className={`size-1.5 rounded-full ${STATUS_TONE[status].dot}`} aria-hidden />
            <span className="text-[13px] leading-[18px] text-muted">{STATUS_SHORT[status]}</span>
            <span className="text-[13px] leading-[18px] font-medium text-ink tabular-nums">
              {count}
            </span>
          </Link>
        </Fragment>
      ))}
    </div>
  )
}

function ShelfSection({ status, books }: { status: BookStatus; books: Book[] }) {
  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`size-2 shrink-0 rounded-full ${STATUS_TONE[status].dot}`} aria-hidden />
          <h2 className="truncate font-display text-[22px] leading-[28px] font-medium">
            {SHELF_TITLES[status]}
          </h2>
          <span
            className={`inline-flex h-6 shrink-0 items-center rounded-[var(--radius-pill)] px-2.5 text-[12px] leading-none font-medium ${STATUS_TONE[status].chip}`}
          >
            {bookCount(books.length)}
          </span>
        </div>
        {books.length > 4 ? (
          <Link
            to={`/shelves/${status}`}
            className="flex h-11 shrink-0 items-center text-[14px] leading-[20px] font-medium text-accent"
          >
            Все
          </Link>
        ) : null}
      </div>
      <div className="mt-3">
        <BookGrid books={books.slice(0, 4)} />
      </div>
    </section>
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
      <ScreenHeader title="Библиотека" caption="Полки" />

      <div className="relative mt-6">
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

      {hasBooks && !hasSearch ? <SummaryStrip books={allBooks} /> : null}

      {books === undefined ? <SkeletonGrid /> : null}

      {books !== undefined && allBooks.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<BookOpen size={28} />}
            title="Полка пока пуста"
            description="Добавьте первую книгу — она появится на полке."
            action={<Button to="/add">Добавить книгу</Button>}
          />
        </div>
      ) : null}

      {hasBooks && hasSearch ? (
        <section className="mt-8">
          <div className="flex items-baseline gap-2">
            <h2 className="font-display text-[22px] leading-[28px] font-medium">Найдено</h2>
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

      {hasBooks && !hasSearch
        ? BOOK_STATUSES.map((status) => {
            const shelfBooks = allBooks.filter((book) => shelfOf(book.status) === status)
            return shelfBooks.length > 0 ? (
              <ShelfSection key={status} status={status} books={shelfBooks} />
            ) : null
          })
        : null}
    </div>
  )
}
