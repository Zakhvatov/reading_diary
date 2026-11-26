import type { StreakInfo } from '@/db/queries/streak'
import { formatDay, parseDay } from '@/lib/dates'
import { pluralRu } from '@/lib/format'
import { Skeleton } from './Skeleton'

const WEEKDAY_SHORT = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' })

type StreakBlockProps = {
  streak: StreakInfo | undefined
}

export function StreakBlock({ streak }: StreakBlockProps) {
  if (!streak) {
    return <Skeleton className="mt-6 h-[124px]" />
  }

  const hasStreak = streak.current > 0

  return (
    <section
      className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-4"
      aria-labelledby="home-streak"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="home-streak" className="font-display text-[20px] leading-[26px] font-medium">
          {hasStreak
            ? `${streak.current} ${pluralRu(streak.current, ['день', 'дня', 'дней'])} подряд`
            : 'Начните серию сегодня'}
        </h2>
      </div>

      {hasStreak ? (
        <p className="mt-1 text-[13px] leading-[18px] text-muted">
          {streak.extendedToday
            ? 'Сегодня уже читали — серия идёт.'
            : 'Сегодня ещё нет сессии — одна минута продлит серию.'}
        </p>
      ) : (
        <p className="mt-1 text-[13px] leading-[18px] text-muted">
          Минута чтения или страница — и день засчитан.
        </p>
      )}

      <ol className="mt-4 grid grid-cols-7 gap-1">
        {streak.last7.map(({ day, active }, index) => {
          const isToday = index === streak.last7.length - 1
          return (
            <li key={day} className="flex flex-col items-center gap-1.5">
              <span
                aria-hidden
                className={[
                  'size-3 rounded-full',
                  active ? 'bg-gold' : 'border border-line bg-paper',
                  isToday ? 'ring-2 ring-gold/30' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
              <span className="text-[11px] leading-[14px] text-muted" aria-hidden>
                {WEEKDAY_SHORT.format(parseDay(day))}
              </span>
              <span className="sr-only">
                {formatDay(day)}: {active ? 'чтение было' : 'чтения не было'}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
