import { CaretRight, ChartBar } from '@phosphor-icons/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useSearchParams } from 'react-router-dom'
import { BarChart } from '@/components/charts/BarChart'
import { Heatmap } from '@/components/charts/Heatmap'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { db } from '@/db/db'
import { getStats, toWeeklySeries } from '@/db/queries/stats'
import type { StatsBreakdown, StatsSummary } from '@/db/queries/stats'
import type { Book, ISODate } from '@/db/types'
import { monthBounds, parseDay, today, weekBounds, yearBounds } from '@/lib/dates'
import { formatDuration, pluralRu } from '@/lib/format'

type Period = 'week' | 'month' | 'year'

const PERIODS: { value: Period; label: string }[] = [
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'year', label: 'Год' },
]

const WEEKDAY_FORMAT = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' })
const DAY_MONTH_FORMAT = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
const MONTH_FORMAT = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' })

function readPeriod(value: string | null): Period {
  return value === 'week' || value === 'year' ? value : 'month'
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function stripDot(value: string): string {
  return value.replace(/\.$/, '')
}

function periodWord(period: Period): string {
  if (period === 'week') return 'неделю'
  if (period === 'year') return 'год'
  return 'месяц'
}

function rangeLabel(period: Period, start: ISODate, end: ISODate): string {
  if (period === 'year') return String(parseDay(start).getFullYear())
  if (period === 'month') {
    return capitalize(MONTH_FORMAT.format(parseDay(start)).replace(/\s*г\.$/, ''))
  }

  const startDate = parseDay(start)
  const endDate = parseDay(end)
  const endLabel = stripDot(DAY_MONTH_FORMAT.format(endDate))

  if (startDate.getMonth() === endDate.getMonth()) {
    return `${startDate.getDate()}–${endLabel}`
  }

  return `${stripDot(DAY_MONTH_FORMAT.format(startDate))} — ${endLabel}`
}

function chartLabel(period: Period, day: ISODate): string {
  if (period === 'week') return stripDot(WEEKDAY_FORMAT.format(parseDay(day)))
  if (period === 'month') return String(parseDay(day).getDate())
  return stripDot(DAY_MONTH_FORMAT.format(parseDay(day)))
}

function MetricTile({ tone, label, value }: { tone: string; label: string; value: string }) {
  return (
    <div className={`rounded-[var(--radius-card)] px-3 py-3 ${tone}`}>
      <p className="text-[11px] leading-[14px] opacity-70">{label}</p>
      <p className="mt-1 font-display text-[24px] leading-[28px] font-medium tabular-nums">
        {value}
      </p>
    </div>
  )
}

function foldRows(rows: StatsBreakdown[], limit = 6): StatsBreakdown[] {
  if (rows.length <= limit) return rows

  const head = rows.slice(0, limit - 1)
  const rest = rows.slice(limit - 1)

  return [
    ...head,
    {
      key: 'other',
      label: 'Другое',
      minutes: rest.reduce((total, row) => total + row.minutes, 0),
      pages: rest.reduce((total, row) => total + row.pages, 0),
      sessions: rest.reduce((total, row) => total + row.sessions, 0),
      share: rest.reduce((total, row) => total + row.share, 0),
    },
  ]
}

function BreakdownBars({
  title,
  caption,
  rows,
  bookCounts,
}: {
  title: string
  caption: string
  rows: StatsBreakdown[]
  bookCounts?: Record<string, number>
}) {
  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-[20px] leading-[26px] font-medium">{title}</h2>
        <span className="text-[13px] leading-[18px] text-muted">{caption}</span>
      </div>
      <ul className="mt-3 space-y-3">
        {foldRows(rows).map((row) => {
          const percent = Math.round(row.share * 100)
          const count = bookCounts?.[row.key]
          return (
            <li key={row.key}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-[14px] leading-[20px]">{row.label}</span>
                <span className="shrink-0 text-[13px] leading-[18px] tabular-nums text-muted">
                  {count ? `${count} кн. · ` : ''}
                  {percent}%
                </span>
              </div>
              <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-line" aria-hidden>
                <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

type CountRow = { key: string; count: number }

const DECIMAL_FORMAT = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 })

function countBooksBy(books: Book[], pick: (book: Book) => string[]): CountRow[] {
  const counts = new Map<string, number>()

  for (const book of books) {
    for (const value of pick(book)) counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key, 'ru'))
}

function toCountRecord(rows: CountRow[]): Record<string, number> {
  return Object.fromEntries(rows.map((row) => [row.key, row.count]))
}

function pagesPerHour(pages: number, minutes: number): number | null {
  if (pages <= 0 || minutes <= 0) return null
  return Math.round((pages / (minutes / 60)) * 10) / 10
}

function TopCounts({
  title,
  caption,
  rows,
  prefix = '#',
}: {
  title: string
  caption: string
  rows: CountRow[]
  prefix?: string
}) {
  if (rows.length === 0) return null

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-[20px] leading-[26px] font-medium">{title}</h2>
        <span className="text-[13px] leading-[18px] text-muted">{caption}</span>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {rows.map((row) => (
          <li
            key={row.key}
            className="flex items-center gap-2 rounded-[var(--radius-pill)] border border-line px-3 py-1.5 text-[13px] leading-[18px]"
          >
            <span className="text-ink">
              {prefix}
              {row.key}
            </span>
            <span className="tabular-nums text-muted">{row.count}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function PagesPerHour({
  total,
  formats,
}: {
  total: number
  formats: { key: string; label: string; speed: number }[]
}) {
  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-[20px] leading-[26px] font-medium">Страниц в час</h2>
        <span className="text-[13px] leading-[18px] text-muted">по сессиям</span>
      </div>
      <div className="mt-3 rounded-[var(--radius-card)] border border-line bg-surface px-4 py-4">
        <p className="font-display text-[34px] leading-[38px] font-medium tabular-nums">
          {DECIMAL_FORMAT.format(total)}
        </p>
        <p className="text-[13px] leading-[18px] text-muted">страниц в час</p>
        {formats.length > 0 ? (
          <ul className="mt-3 border-t border-line pt-2">
            {formats.map((row) => (
              <li key={row.key} className="flex items-baseline justify-between gap-3 py-1.5">
                <span className="text-[14px] leading-[20px]">{row.label}</span>
                <span className="tabular-nums text-[13px] leading-[18px] text-muted">
                  {DECIMAL_FORMAT.format(row.speed)} стр./ч
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  )
}

function StatsContent({
  stats,
  period,
  books,
}: {
  stats: StatsSummary
  period: Period
  books: Book[]
}) {
  const series = period === 'year' ? toWeeklySeries(stats.series) : stats.series
  const points = series.map((point) => ({
    label: chartLabel(period, point.day),
    value: point.minutes,
  }))
  const byPeriod = period === 'year' ? 'неделям' : 'дням'

  const genreCounts = countBooksBy(books, (book) => book.genres)
  const formatCounts = countBooksBy(books, (book) => (book.format ? [book.format] : []))
  const topTags = countBooksBy(books, (book) => book.tags).slice(0, 8)
  const topMoods = countBooksBy(books, (book) => book.moods).slice(0, 8)
  const overallSpeed = pagesPerHour(stats.pages, stats.minutes)
  const formatSpeeds = stats.byFormat.flatMap((row) => {
    const speed = pagesPerHour(row.pages, row.minutes)
    return speed === null ? [] : [{ key: row.key, label: row.label, speed }]
  })

  return (
    <>
      <div className="mt-6 rounded-[var(--radius-card)] bg-sage px-4 py-4 text-sage-ink">
        <p className="text-[11px] leading-[14px] font-medium tracking-[0.08em] uppercase opacity-70">
          Минут за {periodWord(period)}
        </p>
        <p className="mt-1 font-display text-[42px] leading-[46px] font-medium tabular-nums">
          {stats.minutes}
        </p>
        {stats.minutes >= 60 ? (
          <p className="mt-1 text-[13px] leading-[18px] opacity-80">
            {formatDuration(stats.minutes * 60_000)}
          </p>
        ) : null}
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <MetricTile tone="bg-butter text-butter-ink" label="Страниц" value={String(stats.pages)} />
        <MetricTile tone="bg-sky text-sky-ink" label="Сессий" value={String(stats.sessions)} />
        <MetricTile tone="bg-lilac text-lilac-ink" label="Книг" value={String(stats.books)} />
      </div>

      <section className="mt-8">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-[20px] leading-[26px] font-medium">
            {period === 'year' ? 'По неделям' : 'По дням'}
          </h2>
          <span className="text-[13px] leading-[18px] text-muted">минуты</span>
        </div>
        <div className="mt-2">
          <BarChart
            points={points}
            ariaLabel={`Минуты по ${byPeriod}: ${stats.minutes} за период`}
          />
        </div>
      </section>

      {stats.byGenre.length > 0 ? (
        <BreakdownBars
          title="Жанры"
          caption="доля книг"
          rows={stats.byGenre}
          bookCounts={toCountRecord(genreCounts)}
        />
      ) : null}

      {stats.byFormat.length > 0 ? (
        <BreakdownBars
          title="Форматы"
          caption="доля книг"
          rows={stats.byFormat}
          bookCounts={toCountRecord(formatCounts)}
        />
      ) : null}

      {overallSpeed !== null ? <PagesPerHour total={overallSpeed} formats={formatSpeeds} /> : null}

      <TopCounts title="Топ тегов" caption="по книгам периода" rows={topTags} />
      <TopCounts title="Топ настроений" caption="по книгам периода" rows={topMoods} />
    </>
  )
}

export function StatsScreen() {
  const [params, setParams] = useSearchParams()
  const period = readPeriod(params.get('period'))
  const anchor = today()
  const range =
    period === 'week'
      ? weekBounds(anchor)
      : period === 'year'
        ? yearBounds(anchor)
        : monthBounds(anchor)

  const stats = useLiveQuery(() => getStats(range.start, range.end), [range.start, range.end])

  const periodBooks = useLiveQuery(async () => {
    const ids = [...new Set((stats?.byBook ?? []).map((row) => row.bookId))]
    if (ids.length === 0) return []
    const books = await db.books.bulkGet(ids)
    return books.filter((book): book is Book => Boolean(book))
  }, [stats])

  const yearRange = yearBounds(anchor)
  const yearStats = useLiveQuery(
    () => getStats(yearRange.start, yearRange.end),
    [yearRange.start, yearRange.end],
  )
  const yearActiveDays = (yearStats?.series ?? []).filter((day) => day.minutes > 0).length
  const year = parseDay(yearRange.start).getFullYear()

  function changePeriod(next: Period) {
    const updated = new URLSearchParams(params)
    if (next === 'month') {
      updated.delete('period')
    } else {
      updated.set('period', next)
    }
    setParams(updated, { replace: true })
  }

  return (
    <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
      <ScreenHeader
        title="Статистика"
        caption={rangeLabel(period, range.start, range.end)}
        action={
          <Link
            to="/calendar"
            className="flex h-11 items-center text-[14px] leading-[20px] font-medium text-accent"
          >
            Календарь
          </Link>
        }
      />

      <div
        className="mt-6 grid grid-cols-3 gap-1 rounded-[var(--radius-pill)] border border-line bg-surface p-1"
        role="group"
        aria-label="Период"
      >
        {PERIODS.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={period === item.value}
            onClick={() => changePeriod(item.value)}
            className={[
              'h-11 rounded-[var(--radius-pill)] text-[14px] leading-[20px] font-medium transition-colors duration-150',
              period === item.value ? 'bg-accent text-accent-ink' : 'text-muted',
            ].join(' ')}
          >
            {item.label}
          </button>
        ))}
      </div>

      {stats === undefined ? (
        <div className="mt-6 space-y-3" aria-hidden>
          <div className="h-[106px] animate-pulse rounded-[var(--radius-card)] bg-line/50" />
          <div className="h-20 animate-pulse rounded-[var(--radius-card)] bg-line/50" />
          <div className="h-32 animate-pulse rounded-[var(--radius-card)] bg-line/50" />
        </div>
      ) : stats.sessions === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<ChartBar size={28} />}
            title="Пока нет цифр"
            description="Первая сессия — и здесь появятся минуты, страницы и серии дней."
            action={<Button to="/timer">Запустить таймер</Button>}
          />
        </div>
      ) : (
        <>
          <StatsContent stats={stats} period={period} books={periodBooks ?? []} />

          {yearStats && yearActiveDays > 0 ? (
            <section className="mt-8">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-[20px] leading-[26px] font-medium">Год целиком</h2>
                <span className="text-[13px] leading-[18px] text-muted">
                  {yearActiveDays} {pluralRu(yearActiveDays, ['день', 'дня', 'дней'])} с чтением
                </span>
              </div>
              <Heatmap
                days={yearStats.series}
                start={yearRange.start}
                end={yearRange.end}
                ariaLabel={`Дни чтения за ${year}: ${yearActiveDays} из ${yearStats.series.length}`}
                className="mt-3"
              />
            </section>
          ) : null}
        </>
      )}

      <Link
        to="/goal"
        className="mt-8 flex min-h-11 items-center justify-between gap-3 border-t border-line pt-4 text-[15px] leading-[22px] font-medium text-accent"
      >
        Годовая цель
        <CaretRight size={18} aria-hidden />
      </Link>
    </div>
  )
}
