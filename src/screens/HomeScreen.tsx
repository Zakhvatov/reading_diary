import { BookOpen, GearSix } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { BookCover } from '@/components/book/BookCover'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { SpineProgress } from '@/components/ui/SpineProgress'
import { useBooks, useDaySessions } from '@/db/live'
import type { Book } from '@/db/types'
import { formatAuthors } from '@/lib/authors'
import { today } from '@/lib/dates'
import { bookProgress } from '@/lib/progress'

function formatToday(): string {
  const formatted = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

function StatTile({ tone, label, value }: { tone: string; label: string; value: string }) {
  return (
    <div className={`rounded-[var(--radius-card)] px-3 py-3 ${tone}`}>
      <p className="text-[11px] leading-[14px] opacity-70">{label}</p>
      <p className="mt-1 font-display text-[21px] leading-[26px] font-medium tabular-nums">
        {value}
      </p>
    </div>
  )
}

function RecentBooks({ books }: { books: Book[] }) {
  if (books.length === 0) return null

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-[20px] leading-[26px] font-medium">Недавние</h2>
        <Link to="/shelves" className="text-[14px] leading-[20px] font-medium text-accent">
          Все
        </Link>
      </div>
      <div className="-mx-5 mt-3 flex gap-3 overflow-x-auto px-5 pb-1">
        {books.map((book) => (
          <Link key={book.id} to={`/books/${book.id}`} className="w-[76px] shrink-0">
            <BookCover book={book} />
            <p className="mt-1.5 line-clamp-2 text-[12px] leading-[15px]">{book.title}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}

export function HomeScreen() {
  const books = useBooks()
  const reading = useBooks('reading')
  const current = reading?.[0]
  const sessions = useDaySessions(today())

  const minutes = Math.round(
    (sessions ?? []).reduce((total, session) => total + session.durationMs, 0) / 60_000,
  )
  const pages = (sessions ?? []).reduce((total, session) => total + session.pagesRead, 0)
  const year = new Date().getFullYear()
  const finishedThisYear = (books ?? []).filter((book) =>
    book.finishedAt?.startsWith(String(year)),
  ).length
  const recent = (books ?? [])
    .filter((book) => book.status === 'finished' && book.finishedAt)
    .sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? ''))
    .slice(0, 6)

  return (
    <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
      <ScreenHeader
        title="Сегодня"
        caption={formatToday()}
        action={
          <Link
            to="/settings"
            aria-label="Настройки"
            className="flex size-11 items-center justify-center rounded-full text-muted active:bg-accent-soft"
          >
            <GearSix size={22} aria-hidden />
          </Link>
        }
      />

      {books === undefined ? (
        <div className="mt-8 space-y-3" aria-hidden>
          <div className="h-20 animate-pulse rounded-[var(--radius-card)] bg-line/50" />
          <div className="h-36 animate-pulse rounded-[var(--radius-card)] bg-line/50" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-line/50" />
        </div>
      ) : books.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<BookOpen size={28} />}
            title="Полка пока пуста"
            description="Добавьте первую книгу — прогресс, сессии и заметки появятся здесь."
            action={<Button to="/add">Добавить книгу</Button>}
          />
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-3 gap-2">
            <StatTile tone="bg-sage text-sage-ink" label="Сегодня" value={`${minutes} мин`} />
            <StatTile tone="bg-butter text-butter-ink" label="Страниц" value={String(pages)} />
            <StatTile
              tone="bg-lilac text-lilac-ink"
              label="Книг за год"
              value={String(finishedThisYear)}
            />
          </div>

          {current ? (
            <Link
              to={`/books/${current.id}`}
              className="mt-4 flex gap-4 rounded-[var(--radius-card)] bg-peach p-4 text-peach-ink active:brightness-[0.98]"
            >
              <BookCover book={current} className="w-24 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium tracking-[0.08em] uppercase opacity-70">
                  Сейчас читаю
                </p>
                <h2 className="mt-1 line-clamp-2 font-display text-[23px] leading-[29px] font-medium">
                  {current.title}
                </h2>
                <p className="mt-0.5 line-clamp-1 text-[13px] leading-[18px] opacity-80">
                  {formatAuthors(current.authors, true)}
                </p>
                <SpineProgress value={bookProgress(current)} className="mt-3" />
                <p className="mt-2 text-[13px] leading-[18px] opacity-80">
                  {current.pageCount
                    ? `${current.currentPage} из ${current.pageCount} стр.`
                    : `${current.currentPage} стр.`}{' '}
                  · {Math.round(bookProgress(current) * 100)}%
                </p>
              </div>
            </Link>
          ) : (
            <section className="mt-4 rounded-[var(--radius-card)] bg-sky p-5 text-sky-ink">
              <h2 className="font-display text-[22px] leading-[28px] font-medium">
                Сейчас ничего не читается
              </h2>
              <p className="mt-2 text-[14px] leading-[20px] opacity-80">
                Выберите книгу на полке или добавьте новую.
              </p>
              <Button to="/shelves" variant="outline" className="mt-5">
                Открыть библиотеку
              </Button>
            </section>
          )}

          <RecentBooks books={recent} />

          <p className="mt-8 text-[13px] leading-[18px] text-muted">
            Данные хранятся только в этом браузере.
          </p>
        </>
      )}
    </div>
  )
}
