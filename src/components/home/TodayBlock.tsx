import { Link } from 'react-router-dom'
import { ProgressRing } from '@/components/charts/ProgressRing'
import { Skeleton } from './Skeleton'

type TodayBlockProps = {
  minutes: number
  pages: number
  finishedThisYear: number
  /** 0 — дневная цель выключена. */
  goalMinutes: number
  loading: boolean
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

export function TodayBlock({
  minutes,
  pages,
  finishedThisYear,
  goalMinutes,
  loading,
}: TodayBlockProps) {
  const hasGoal = goalMinutes > 0

  return (
    <section className="mt-6" aria-labelledby="home-today">
      <div className="flex items-center justify-between gap-3">
        <h2 id="home-today" className="font-display text-[20px] leading-[26px] font-medium">
          Сегодня
        </h2>
        {!loading && !hasGoal ? (
          <Link
            to="/settings"
            className="inline-flex min-h-11 items-center text-[13px] leading-[18px] text-muted underline-offset-4 active:underline"
          >
            Задать цель дня
          </Link>
        ) : null}
      </div>

      {loading ? (
        <Skeleton className="mt-3 h-[104px]" />
      ) : hasGoal ? (
        <div className="mt-3 rounded-[var(--radius-card)] border border-line bg-surface p-4">
          <div className="flex items-center gap-4">
            <ProgressRing
              value={minutes / goalMinutes}
              ariaLabel={`Прочитано ${minutes} из ${goalMinutes} минут сегодня`}
              size={92}
              strokeWidth={8}
            >
              <span className="font-display text-[24px] leading-[28px] font-medium tabular-nums">
                {minutes}
              </span>
              <span className="text-[11px] leading-[14px] text-muted">мин</span>
            </ProgressRing>

            <div className="min-w-0 flex-1">
              <p className="text-[13px] leading-[18px] text-muted">
                {minutes} из {goalMinutes} мин
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <StatTile tone="bg-butter text-butter-ink" label="Страниц" value={String(pages)} />
                <StatTile
                  tone="bg-lilac text-lilac-ink"
                  label="Книг за год"
                  value={String(finishedThisYear)}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <StatTile tone="bg-sage text-sage-ink" label="Минут" value={String(minutes)} />
          <StatTile tone="bg-butter text-butter-ink" label="Страниц" value={String(pages)} />
          <StatTile
            tone="bg-lilac text-lilac-ink"
            label="Книг за год"
            value={String(finishedThisYear)}
          />
        </div>
      )}
    </section>
  )
}
