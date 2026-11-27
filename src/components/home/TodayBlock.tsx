import { Link } from 'react-router-dom'
import type { StreakInfo } from '@/db/queries/streak'
import { Skeleton } from './Skeleton'

type TodayBlockProps = {
  minutes: number
  pages: number
  finishedThisYear: number
  /** 0 — дневная цель выключена. */
  goalMinutes: number
  streak: StreakInfo | undefined
  loading: boolean
}

const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']

/** Две стеклянные плитки: минуты и серия. */
export function TodayBlock({
  minutes,
  pages,
  finishedThisYear,
  goalMinutes,
  streak,
  loading,
}: TodayBlockProps) {
  const hasGoal = goalMinutes > 0
  const goalProgress = hasGoal ? Math.min(Math.max(minutes / goalMinutes, 0), 1) : 0
  const last7 = streak?.last7 ?? []

  if (loading) {
    return (
      <section className="mt-5" aria-labelledby="home-today">
        <h2 id="home-today" className="sr-only">
          Сегодня
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          <Skeleton className="h-[152px]" />
          <Skeleton className="h-[152px]" />
        </div>
      </section>
    )
  }

  return (
    <section className="mt-5" aria-labelledby="home-today">
      <h2 id="home-today" className="sr-only">
        Сегодня
      </h2>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
          <p className="text-[11px] leading-[14px] font-semibold tracking-[0.12em] uppercase text-muted">
            Минуты сегодня
          </p>
          <p className="mt-1 font-display text-[42px] leading-none font-medium tabular-nums">
            {minutes}
          </p>
          <p className="mt-1.5 text-[12px] leading-[16px] text-muted">
            {hasGoal ? `из ${goalMinutes} мин` : 'без цели'} · {pages} стр.
          </p>
          {hasGoal ? (
            <div
              className="mt-3 h-1 overflow-hidden rounded-full bg-line"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={goalMinutes}
              aria-valuenow={Math.min(minutes, goalMinutes)}
              aria-label={`Прочитано ${minutes} из ${goalMinutes} минут`}
            >
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.round(goalProgress * 100)}%` }}
              />
            </div>
          ) : (
            <Link
              to="/settings"
              className="mt-1 inline-flex min-h-11 items-center text-[11px] leading-[14px] text-muted underline-offset-4 active:underline"
            >
              Задать цель дня
            </Link>
          )}
          <p className="mt-1.5 text-[11px] leading-[14px] text-muted">
            {finishedThisYear} книг за год
          </p>
        </div>

        <div className="rounded-[var(--radius-card)] border border-line bg-accent p-4 text-accent-ink">
          <p className="text-[11px] leading-[14px] font-semibold tracking-[0.12em] uppercase">
            Стрик
          </p>
          <p className="mt-1 font-display text-[42px] leading-none font-medium tabular-nums">
            {streak?.current ?? 0}
          </p>
          <p className="mt-1.5 text-[12px] leading-[16px]">дней подряд</p>
          <div className="mt-2.5 flex items-center gap-1" aria-hidden>
            {last7.map(({ day, active }, index) => {
              const isToday = index === last7.length - 1
              return (
                <span
                  key={day}
                  className={[
                    'size-2.5 rounded-full',
                    active ? 'bg-accent-ink' : 'border border-accent-ink/35 bg-transparent',
                    isToday ? 'ring-2 ring-accent-ink/30' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                />
              )
            })}
          </div>
          {streak && streak.longest > 0 ? (
            <p className="mt-1.5 text-[11px] leading-[14px]">рекорд {streak.longest}</p>
          ) : null}
          <p className="mt-1 text-[11px] leading-[14px]">
            {streak?.extendedToday ? 'Серия идёт' : 'Минута продлит серию'}
          </p>
          <span className="sr-only">
            {WEEKDAYS.map((day, index) => `${day}: ${last7[index]?.active ? 'да' : 'нет'}`).join(', ')}
          </span>
        </div>
      </div>
    </section>
  )
}
