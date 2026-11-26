import { BookOpen } from '@phosphor-icons/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookCover } from '@/components/book/BookCover'
import { BackupBanner } from '@/components/home/BackupBanner'
import {
  dismissBackupBanner,
  isBackupBannerDismissed,
  isBackupStale,
} from '@/components/home/backup'
import { HomeHeader } from '@/components/home/HomeHeader'
import { JournalPreview } from '@/components/home/JournalPreview'
import { Skeleton } from '@/components/home/Skeleton'
import { StreakBlock } from '@/components/home/StreakBlock'
import { TodayBlock } from '@/components/home/TodayBlock'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { SpineProgress } from '@/components/ui/SpineProgress'
import { useBooks, useDaySessions, useJournals, useSettings } from '@/db/live'
import { getStreak } from '@/db/queries/streak'
import type { Book } from '@/db/types'
import { formatAuthors } from '@/lib/authors'
import { shelfOf } from '@/lib/bookStatus'
import { today } from '@/lib/dates'
import { formatDuration, pluralRu } from '@/lib/format'
import { bookProgress } from '@/lib/progress'

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

function CurrentBook({ book }: { book: Book }) {
  const progress = bookProgress(book)
  const hasReadingTime = book.totalReadingMs > 0
  const hasSessions = book.sessionCount > 0

  return (
    <Link
      to={`/books/${book.id}`}
      className="mt-4 flex gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4 text-ink active:bg-accent-soft/30"
    >
      <BookCover book={book} className="w-24 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-accent">
          Сейчас читаю
        </p>
        <h2 className="mt-1 line-clamp-2 font-display text-[22px] leading-[28px] font-medium">
          {book.title}
        </h2>
        <p className="mt-0.5 line-clamp-1 text-[13px] leading-[18px] text-muted">
          {formatAuthors(book.authors, true)}
        </p>
        <SpineProgress value={progress} className="mt-3" />
        <p className="mt-2 text-[13px] leading-[18px] text-muted">
          {book.pageCount
            ? `${book.currentPage} из ${book.pageCount} стр.`
            : `${book.currentPage} стр.`}{' '}
          · {Math.round(progress * 100)}%
        </p>
        {hasReadingTime || hasSessions ? (
          <p className="mt-1 text-[12px] leading-[16px] text-muted">
            {hasReadingTime ? `Всего ${formatDuration(book.totalReadingMs)}` : null}
            {hasReadingTime && hasSessions ? ' · ' : null}
            {hasSessions
              ? `${book.sessionCount} ${pluralRu(book.sessionCount, [
                  'сессия',
                  'сессии',
                  'сессий',
                ])}`
              : null}
          </p>
        ) : null}
      </div>
    </Link>
  )
}

export function HomeScreen() {
  const anchor = today()
  const books = useBooks()
  const current = (books ?? []).find((book) => shelfOf(book.status) === 'reading')
  const sessions = useDaySessions(anchor)
  const settings = useSettings()
  const journals = useJournals()
  const streak = useLiveQuery(() => getStreak(anchor), [anchor])
  const [bannerHidden, setBannerHidden] = useState(isBackupBannerDismissed)

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

  const showBackupBanner =
    settings !== undefined && !bannerHidden && isBackupStale(settings.lastBackupAt)

  function hideBackupBanner() {
    dismissBackupBanner()
    setBannerHidden(true)
  }

  return (
    <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
      <HomeHeader />

      {showBackupBanner ? <BackupBanner onDismiss={hideBackupBanner} /> : null}

      {books === undefined ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-40" />
          <Skeleton className="h-28" />
        </div>
      ) : (
        <>
          <TodayBlock
            minutes={minutes}
            pages={pages}
            finishedThisYear={finishedThisYear}
            goalMinutes={settings?.dailyGoalMinutes ?? 0}
            loading={settings === undefined || sessions === undefined}
          />

          {books.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                icon={<BookOpen size={28} />}
                title="Полка пока пуста"
                description="Добавьте первую книгу — прогресс, сессии и заметки появятся здесь."
                action={<Button to="/add">Добавить книгу</Button>}
              />
            </div>
          ) : current ? (
            <CurrentBook book={current} />
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

          <StreakBlock streak={streak} />

          <JournalPreview entry={journals?.[0]} loading={journals === undefined} />
        </>
      )}

      <p className="mt-8 text-[13px] leading-[18px] text-muted">
        Данные хранятся только в этом браузере.
      </p>
    </div>
  )
}
