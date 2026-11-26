import { BookOpen, GearSix } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { BookCover } from '@/components/book/BookCover'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { SpineProgress } from '@/components/ui/SpineProgress'
import { useBooks } from '@/db/live'
import { formatAuthors } from '@/lib/authors'
import { formatPercent } from '@/lib/format'
import { bookProgress } from '@/lib/progress'

function formatToday(): string {
  const formatted = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

export function HomeScreen() {
  const books = useBooks()
  const reading = useBooks('reading')
  const current = reading?.[0]

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
          <div className="h-28 animate-pulse rounded-[var(--radius-card)] bg-line/50" />
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
      ) : current ? (
        <>
          <Link
            to={`/books/${current.id}`}
            className="mt-6 flex gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4 active:bg-accent-soft/40"
          >
            <BookCover book={current} className="w-20 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                Сейчас читаю
              </p>
              <h2 className="mt-1 line-clamp-2 font-display text-[20px] leading-[26px] font-medium">
                {current.title}
              </h2>
              <p className="mt-0.5 line-clamp-1 text-[13px] leading-[18px] text-muted">
                {formatAuthors(current.authors, true)}
              </p>
              <SpineProgress value={bookProgress(current)} className="mt-3" />
              <p className="mt-2 text-[13px] leading-[18px] text-muted">
                {formatPercent(bookProgress(current))}
              </p>
            </div>
          </Link>
          <Button to={`/books/${current.id}`} className="mt-4 w-full">
            Продолжить
          </Button>
        </>
      ) : (
        <section className="mt-8 rounded-[var(--radius-card)] border border-line bg-surface p-6">
          <h2 className="font-display text-[20px] leading-[26px] font-medium">
            Сейчас ничего не читается
          </h2>
          <p className="mt-2 text-muted">Выберите книгу на полке или добавьте новую.</p>
          <Button to="/shelves" variant="outline" className="mt-5">
            Открыть библиотеку
          </Button>
        </section>
      )}

      <p className="mt-8 text-[13px] leading-[18px] text-muted">
        Данные хранятся только в этом браузере.
      </p>
    </div>
  )
}
