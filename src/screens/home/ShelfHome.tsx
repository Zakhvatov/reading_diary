import { ArrowRight } from '@phosphor-icons/react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { BookCover } from '@/components/book/BookCover'
import { BackupBanner } from '@/components/home/BackupBanner'
import { HomeHeader } from '@/components/home/HomeHeader'
import { Skeleton } from '@/components/home/Skeleton'
import { Button } from '@/components/ui/Button'
import { formatDayShort } from '@/lib/dates'
import { formatDuration, pluralRu } from '@/lib/format'
import { bookProgress } from '@/lib/progress'
import { useHomeBackupBanner, type HomeData } from './homeData'

const SPINE_COLORS = [
  'var(--color-cover-forest)',
  'var(--color-cover-navy)',
  'var(--color-cover-ochre)',
  'var(--color-cover-wine)',
  'var(--color-cover-teal)',
  'var(--color-cover-slate)',
]

function excerpt(text: string, limit = 90): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > limit ? `${clean.slice(0, limit).trimEnd()}…` : clean
}

function ShelfLoading() {
  return (
    <div className="mt-5 space-y-4" aria-hidden>
      <Skeleton className="h-[300px] rounded-2xl" />
      <Skeleton className="h-28 rounded-xl" />
      <div className="flex gap-3">
        <Skeleton className="h-20 w-12" />
        <Skeleton className="h-20 w-12" />
        <Skeleton className="h-20 w-12" />
        <Skeleton className="h-20 w-12" />
      </div>
    </div>
  )
}

export function ShelfHome({ data }: { data: HomeData }) {
  const banner = useHomeBackupBanner(data.backupStale)
  const { current, streak, journals, settings } = data
  const latestJournal = journals?.[0]
  const progress = current ? Math.round(bookProgress(current) * 100) : 0

  const spineBooks = (
    data.recent.length > 0
      ? data.recent
      : (data.books ?? []).filter((book) => book.id !== current?.id)
  ).slice(0, 4)

  return (
    <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
      <HomeHeader />
      {banner.show ? <BackupBanner onDismiss={banner.dismiss} /> : null}

      {data.loading ? (
        <ShelfLoading />
      ) : (
        <>
          <section className="shelf-scene" aria-label="Полка с книгами">
            <div className="shelf-glow" aria-hidden />
            <div className="shelf-lamp" aria-hidden>
              <span className="cord" />
              <span className="shade" />
              <span className="bulb" />
            </div>

            {current ? (
              <Link
                to={`/books/${current.id}`}
                className="shelf-current"
                aria-label={`Сейчас читаю: ${current.title}`}
              >
                <div className="shelf-book">
                  <BookCover book={current} className="h-full w-full" />
                </div>
                <span className="shelf-ribbon" aria-hidden />
                <span className="shelf-sticker">{progress}%</span>
              </Link>
            ) : (
              <div className="shelf-empty">
                <p className="font-medium text-ink">Сейчас ничего не читается</p>
                <Link to="/shelves" className="mt-2 inline-flex items-center gap-1 text-accent">
                  Выбрать книгу <ArrowRight size={12} aria-hidden />
                </Link>
              </div>
            )}

            <div className="shelf-spines" aria-label="Недавние книги">
              {spineBooks.map((book, index) => (
                <Link
                  key={book.id}
                  to={`/books/${book.id}`}
                  className={['shelf-spine-book', index === 1 ? 'lean' : ''].join(' ')}
                  title={book.title}
                  style={
                    {
                      '--spine-w': `${13 + (index % 3) * 4}px`,
                      '--spine-h': `${70 + (index % 4) * 9}%`,
                      '--spine-c': SPINE_COLORS[index % SPINE_COLORS.length],
                    } as CSSProperties
                  }
                >
                  <span className="shelf-spine-title">{book.title}</span>
                </Link>
              ))}
            </div>

            <div className="shelf-plank" aria-hidden />
            <span className="shelf-plaque">
              {data.minutes > 0 ? `${data.minutes} мин · ${data.pages} стр` : 'сегодня пока тихо'}
            </span>
          </section>

          {data.books?.length === 0 ? (
            <div className="mt-6">
              <div className="shelf-note">
                <span className="shelf-pin" aria-hidden />
                <h2 className="font-display text-[20px] text-ink">Полка пока пуста</h2>
                <p className="mt-2 text-[14px] leading-[21px] text-muted">
                  Добавьте первую книгу — прогресс, сессии и заметки появятся здесь.
                </p>
                <Button to="/add" className="mt-4">
                  Добавить книгу
                </Button>
              </div>
            </div>
          ) : (
            <>
              <section className="shelf-note" aria-labelledby="shelf-streak">
                <span className="shelf-pin" aria-hidden />
                <div className="shelf-note-head">
                  <h2 id="shelf-streak">
                    {streak && streak.current > 0
                      ? `${streak.current} ${pluralRu(streak.current, ['день', 'дня', 'дней'])} подряд`
                      : 'Начните серию сегодня'}
                  </h2>
                  {streak && streak.current > 0 ? (
                    <span className="shelf-seal" aria-hidden>
                      <b>{streak.current}</b>
                      <span>{pluralRu(streak.current, ['день', 'дня', 'дней'])}</span>
                    </span>
                  ) : null}
                </div>

                <div className="shelf-dots" aria-hidden>
                  {(streak?.last7 ?? Array.from({ length: 7 }, () => null)).map((day, index) => (
                    <i key={day?.day ?? index} className={day?.active ? '' : 'off'} />
                  ))}
                </div>

                <p className="shelf-src mt-3">
                  Сегодня{' '}
                  {data.minutes > 0 ? formatDuration(data.minutes * 60_000) : 'пока без чтения'}
                  {settings?.dailyGoalMinutes ? ` · цель ${settings.dailyGoalMinutes} мин` : ''}
                  {data.finishedThisYear > 0 ? ` · ${data.finishedThisYear} книг за год` : ''}
                </p>
              </section>

              {data.recent.length > 0 ? (
                <section className="shelf-recent" aria-labelledby="shelf-recent">
                  <div className="shelf-recent-head">
                    <h2 id="shelf-recent">Недавние</h2>
                    <Link to="/shelves">Все</Link>
                  </div>
                  <div className="shelf-mini-row">
                    {data.recent.slice(0, 4).map((book) => (
                      <Link key={book.id} to={`/books/${book.id}`} className="shelf-mini">
                        <BookCover book={book} plain />
                        <p>{book.title}</p>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="shelf-journal" aria-labelledby="shelf-journal">
                <div className="shelf-recent-head">
                  <h2 id="shelf-journal">Дневник</h2>
                  <Link to="/journals">Все</Link>
                </div>
                {latestJournal ? (
                  <Link to={`/journals/${latestJournal.id}`} className="shelf-journal-card">
                    <p className="shelf-journal-title">{latestJournal.title}</p>
                    <p className="shelf-journal-body">
                      {excerpt(latestJournal.body || latestJournal.title)}
                    </p>
                    <p className="shelf-journal-date">{formatDayShort(latestJournal.entryDate)}</p>
                  </Link>
                ) : (
                  <Link to="/journals/new" className="shelf-journal-card">
                    <p className="shelf-journal-title">Записать мысль</p>
                    <p className="shelf-journal-body">О книге, герое или дне чтения.</p>
                  </Link>
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  )
}
