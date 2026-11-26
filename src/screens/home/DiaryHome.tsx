import { ArrowRight, GearSix } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { BookCover } from '@/components/book/BookCover'
import { BackupBanner } from '@/components/home/BackupBanner'
import { Skeleton } from '@/components/home/Skeleton'
import { Button } from '@/components/ui/Button'
import { formatHomeDate } from '@/components/home/greeting'
import { formatDayShort } from '@/lib/dates'
import { formatDuration, pluralRu } from '@/lib/format'
import { bookProgress } from '@/lib/progress'
import { useHomeBackupBanner, type HomeData } from './homeData'

const TIME = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })

function excerpt(text: string, limit = 80): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > limit ? `${clean.slice(0, limit).trimEnd()}…` : clean
}

function DiaryLoading() {
  return (
    <div className="pad-x pt-[calc(var(--safe-top)+20px)]" aria-hidden>
      <div className="diary-sheet">
        <div className="diary-page space-y-4 py-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  )
}

export function DiaryHome({ data }: { data: HomeData }) {
  const banner = useHomeBackupBanner(data.backupStale)
  const { current, streak, sessions, settings } = data
  const latestJournal = data.journals?.[0]
  const progress = current ? Math.round(bookProgress(current) * 100) : 0

  const now = new Date()
  const [weekday = '', date = ''] = formatHomeDate(now).split(', ')
  const todaySessions = (sessions ?? [])
    .slice()
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .slice(-2)

  const goal = settings?.dailyGoalMinutes ?? 0
  const remaining = Math.max(0, goal - data.minutes)
  const streakDays = streak?.current ?? 0

  return (
    <div className="pad-x pt-[calc(var(--safe-top)+18px)]">
      {banner.show ? <BackupBanner onDismiss={banner.dismiss} /> : null}

      {data.loading ? (
        <DiaryLoading />
      ) : (
        <div className="diary-sheet">
          <div className="diary-holes" aria-hidden>
            <i />
            <i />
            <i />
          </div>

          <div className={`diary-page${current ? ' has-reading' : ''}`}>
            <header className="diary-head">
              <p className="diary-weekday">{weekday.toLowerCase()}</p>
              <p className="diary-date">{date}</p>
              <Link to="/settings" className="diary-gear" aria-label="Настройки">
                <GearSix size={20} aria-hidden />
              </Link>

              {current ? (
                <Link
                  to={`/books/${current.id}`}
                  className="diary-polaroid"
                  aria-label={`Сейчас читаю: ${current.title}`}
                >
                  <div className="diary-polaroid-photo">
                    <BookCover book={current} />
                  </div>
                  <span className="diary-polaroid-cap">сейчас читаю</span>
                </Link>
              ) : null}
            </header>

            {current ? (
              <>
                <p className="diary-note">
                  сегодня с
                  <svg
                    viewBox="0 0 24 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    aria-hidden
                  >
                    <path d="M2 3c5 1 9 4 12 9" />
                    <path d="M14 12l3 1-1-4" />
                  </svg>
                </p>
                <h1 className="diary-title">{current.title}</h1>
                <p className="diary-author">
                  {current.authors[0] ?? 'Автор не указан'} · {current.genres[0] ?? 'книга'}
                </p>

                <div className="diary-progress">
                  <span className="diary-pages">
                    {current.pageCount ? (
                      <>
                        {current.currentPage} <em>/ {current.pageCount} стр.</em>
                      </>
                    ) : (
                      <em>{progress}% прочитано</em>
                    )}
                  </span>
                  <span className="diary-track" aria-hidden>
                    <i style={{ width: `${Math.min(progress, 100)}%` }} />
                  </span>
                  <span className="diary-pct">{progress}%</span>
                </div>
              </>
            ) : (
              <div className="diary-empty">
                <h2>Чистая страница</h2>
                <p>
                  Сейчас ничего не читается. Выберите книгу на полке — страница заполнится сама.
                </p>
                <Button to="/shelves" variant="outline" className="mt-4">
                  Открыть библиотеку
                </Button>
              </div>
            )}

            <div className="diary-entries">
              {todaySessions.length > 0 ? (
                todaySessions.map((session) => (
                  <div key={session.id} className="diary-entry">
                    <span className="diary-time">{TIME.format(new Date(session.startedAt))}</span>
                    <div className="diary-entry-body">
                      <p>
                        {formatDuration(session.durationMs)} · {session.pagesRead}{' '}
                        {pluralRu(session.pagesRead, ['страница', 'страницы', 'страниц'])}
                      </p>
                      <span>{session.note ? excerpt(session.note, 60) : 'сессия чтения'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="diary-hand">сегодня ещё не читали — страница ждёт.</p>
              )}
            </div>

            <div className="diary-stamps" aria-label="Статистика">
              <span className="diary-stamp">{data.minutes} мин</span>
              <span className="diary-stamp circle">{data.pages} стр</span>
              <span className="diary-stamp amber">
                {streakDays > 0
                  ? `${streakDays} ${pluralRu(streakDays, ['день', 'дня', 'дней'])}`
                  : `${data.finishedThisYear} книг`}
              </span>
            </div>

            {streak ? (
              <div className="diary-streak" aria-label={`Серия: ${streak.current}`}>
                <span className="diary-streak-label">серия</span>
                <span className="diary-streak-dots" aria-hidden>
                  {streak.last7.map((day) => (
                    <i key={day.day} className={day.active ? 'on' : ''} />
                  ))}
                </span>
                <span className="diary-streak-count">{streak.current}</span>
              </div>
            ) : null}

            <p className="diary-hand">
              {data.minutes > 0 ? (
                <>
                  сегодня{' '}
                  <u>
                    {data.minutes} {pluralRu(data.minutes, ['минута', 'минуты', 'минут'])}
                  </u>{' '}
                  —{' '}
                  {goal > 0
                    ? remaining > 0
                      ? `до цели дня ${remaining} мин.`
                      : 'цель дня закрыта.'
                    : 'и это уже хорошо.'}
                </>
              ) : (
                <>день только начинается. одна страница — и он засчитан.</>
              )}
            </p>

            <div className="diary-quote-slot">
              {latestJournal ? (
                <Link to={`/journals/${latestJournal.id}`} className="diary-quote block">
                  <p>«{excerpt(latestJournal.body || latestJournal.title)}»</p>
                  <span className="diary-quote-src">
                    {latestJournal.title} · {formatDayShort(latestJournal.entryDate)} →
                  </span>
                </Link>
              ) : (
                <Link to="/journals/new" className="diary-quote block">
                  <p>«Здесь появится первая запись этого дня.»</p>
                  <span className="diary-quote-src">
                    Записать мысль <ArrowRight size={12} aria-hidden />
                  </span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
