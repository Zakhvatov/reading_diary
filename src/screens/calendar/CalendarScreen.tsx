import { CalendarDots, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BookCover } from '@/components/book/BookCover'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { Sheet } from '@/components/ui/Sheet'
import { useBooks, useDaySessions } from '@/db/live'
import {
  getCalendarMonth,
  monthAnchor,
  monthLabel,
  normalizeMonth,
  shiftMonth,
} from '@/db/queries/calendar'
import type { CalendarDay } from '@/db/queries/calendar'
import type { Book, ISODate, Session } from '@/db/types'
import { formatDay, monthDays, parseDay, today } from '@/lib/dates'
import { formatDuration, pluralRu } from '@/lib/format'

const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']

function DaySessions({ sessions, onClose }: { sessions: Session[]; onClose: () => void }) {
  const books = useBooks()
  const bookMap = new Map((books ?? []).map((book) => [book.id, book]))
  const sorted = [...sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt))

  if (sorted.length === 0) {
    return (
      <div>
        <p className="text-[14px] leading-[20px] text-muted">В этот день сессий не было.</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 flex h-11 items-center text-[15px] font-medium text-accent"
        >
          Закрыть
        </button>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-line">
      {sorted.map((session) => {
        const book = bookMap.get(session.bookId)
        return (
          <li key={session.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            {book ? (
              <BookCover book={book} className="w-10 shrink-0" />
            ) : (
              <div className="aspect-[2/3] w-10 shrink-0 rounded-[6px] bg-line/60" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 font-display text-[16px] leading-[21px] font-medium">
                {book?.title ?? 'Книга удалена'}
              </p>
              <p className="mt-1 text-[13px] leading-[18px] text-muted">
                {formatDuration(session.durationMs)}
                {session.pagesRead > 0
                  ? ` · ${session.pagesRead} ${pluralRu(session.pagesRead, ['страница', 'страницы', 'страниц'])}`
                  : ''}
              </p>
              {session.note ? (
                <p className="mt-1 line-clamp-2 text-[13px] leading-[18px] text-muted">
                  {session.note}
                </p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function DayCell({
  day,
  entry,
  book,
  isToday,
}: {
  day: ISODate
  entry?: CalendarDay
  book?: Book
  isToday: boolean
}) {
  return (
    <div className="flex min-h-[62px] flex-col rounded-[10px] p-1.5">
      <div className="flex items-start justify-between gap-1">
        <span
          className={
            isToday
              ? 'text-[13px] leading-[16px] font-semibold text-accent'
              : 'text-[13px] leading-[16px] text-ink'
          }
        >
          {parseDay(day).getDate()}
        </span>
        {entry && entry.pages > 0 ? (
          <span className="rounded-full bg-accent-soft px-1 text-[10px] leading-[15px] font-medium tabular-nums text-accent">
            {entry.pages}
          </span>
        ) : null}
      </div>
      {book ? <BookCover book={book} className="mt-auto w-4 rounded-[2px]" /> : null}
    </div>
  )
}

export function CalendarScreen() {
  const [params, setParams] = useSearchParams()
  const month = normalizeMonth(params.get('month'))
  const anchor = monthAnchor(month)
  const data = useLiveQuery(() => getCalendarMonth(anchor), [anchor])
  const books = useBooks()
  const [selected, setSelected] = useState<ISODate | null>(null)
  const daySessions = useDaySessions(selected ?? today())

  const bookMap = new Map((books ?? []).map((book) => [book.id, book]))
  const days = monthDays(anchor)
  const leading = (parseDay(anchor).getDay() + 6) % 7
  const todayDay = today()
  const hasSessions = Boolean(data && data.days.size > 0)

  let minutes = 0
  if (data) {
    for (const entry of data.days.values()) minutes += entry.minutes
  }

  function goToMonth(delta: number) {
    const next = new URLSearchParams(params)
    next.set('month', shiftMonth(month, delta))
    setParams(next, { replace: true })
  }

  return (
    <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
      <ScreenHeader title="Календарь" caption="Статистика" back />

      <div className="mt-6 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Предыдущий месяц"
          onClick={() => goToMonth(-1)}
          className="flex size-11 items-center justify-center rounded-full text-ink active:bg-accent-soft"
        >
          <CaretLeft size={20} aria-hidden />
        </button>
        <div className="min-w-0 text-center">
          <p className="font-display text-[20px] leading-[26px] font-medium">{monthLabel(month)}</p>
          {hasSessions ? (
            <p className="mt-0.5 text-[12px] leading-[16px] text-muted">
              {data?.days.size ?? 0} {pluralRu(data?.days.size ?? 0, ['день', 'дня', 'дней'])} ·{' '}
              {minutes} {pluralRu(minutes, ['минута', 'минуты', 'минут'])}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Следующий месяц"
          onClick={() => goToMonth(1)}
          className="flex size-11 items-center justify-center rounded-full text-ink active:bg-accent-soft"
        >
          <CaretRight size={20} aria-hidden />
        </button>
      </div>

      <div className="-mx-2 mt-4 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="pb-1 text-center text-[11px] leading-[14px] font-medium tracking-[0.08em] text-muted uppercase"
          >
            {weekday}
          </div>
        ))}
        {Array.from({ length: leading }, (_, index) => (
          <div key={`blank-${index}`} aria-hidden />
        ))}
        {days.map((day) => {
          const entry = data?.days.get(day)
          const firstBookId = entry?.bookIds[0]
          const book = firstBookId ? bookMap.get(firstBookId) : undefined
          const isToday = day === todayDay
          return (
            <button
              key={day}
              type="button"
              aria-label={
                entry
                  ? `${formatDay(day)}: ${entry.minutes} мин, ${entry.pages} стр.`
                  : `${formatDay(day)}: нет сессий`
              }
              onClick={() => setSelected(day)}
              className={[
                'rounded-[10px] text-left align-top transition-colors duration-150 active:bg-accent-soft',
                entry ? 'border border-line bg-surface' : 'border border-transparent',
                isToday ? 'ring-2 ring-accent ring-inset' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <DayCell day={day} entry={entry} book={book} isToday={isToday} />
            </button>
          )
        })}
      </div>

      {data === undefined ? (
        <div
          className="mt-4 h-24 animate-pulse rounded-[var(--radius-card)] bg-line/40"
          aria-hidden
        />
      ) : null}

      {data !== undefined && !hasSessions ? (
        <div className="mt-6 flex items-start gap-3 rounded-[var(--radius-card)] border border-dashed border-line px-4 py-5">
          <CalendarDots size={22} className="mt-0.5 shrink-0 text-muted" aria-hidden />
          <div>
            <p className="text-[14px] leading-[20px] font-medium">В этом месяце нет сессий</p>
            <p className="mt-1 text-[13px] leading-[18px] text-muted">
              В день чтения появятся число, обложка и страницы.
            </p>
          </div>
        </div>
      ) : null}

      <Sheet
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? formatDay(selected) : 'День'}
      >
        {daySessions === undefined ? (
          <p className="text-[14px] leading-[20px] text-muted">Загружаю…</p>
        ) : (
          <DaySessions sessions={daySessions} onClose={() => setSelected(null)} />
        )}
      </Sheet>
    </div>
  )
}
