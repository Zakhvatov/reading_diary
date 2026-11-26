import { Target } from '@phosphor-icons/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { ProgressRing } from '@/components/charts/ProgressRing'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { countFinishedBooks } from '@/db/queries/stats'
import { getStreak, type StreakInfo } from '@/db/queries/streak'
import { createGoal, getGoal, updateGoal } from '@/db/repositories/goals'
import { formatDay, parseDay, today } from '@/lib/dates'
import { pluralRu } from '@/lib/format'

const WEEKDAY_FORMAT = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' })
const MAX_TARGET = 9999

function GoalEditor({
  year,
  initialTarget,
  hasGoal,
}: {
  year: number
  initialTarget: number
  hasGoal: boolean
}) {
  const [value, setValue] = useState(String(initialTarget))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = Number(value)

    if (!Number.isInteger(parsed) || parsed < 1) {
      setError('Укажите цель от 1 книги')
      return
    }
    if (parsed > MAX_TARGET) {
      setError(`Не больше ${MAX_TARGET} книг`)
      return
    }

    setError(null)
    setSaving(true)
    try {
      if (hasGoal) {
        await updateGoal(year, parsed)
      } else {
        await createGoal(year, parsed)
      }
    } catch {
      setError('Не удалось сохранить цель')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-6">
      <label htmlFor="goal-target" className="text-[13px] leading-[18px] font-medium text-muted">
        Цель по книгам
      </label>
      <div className="mt-2 flex items-start gap-2">
        <input
          id="goal-target"
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_TARGET}
          step={1}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="h-[52px] w-full min-w-0 flex-1 rounded-[var(--radius-control)] border border-line bg-surface px-4 text-[16px] tabular-nums text-ink focus-visible:border-accent focus-visible:outline-none"
        />
        <Button type="submit" disabled={saving} className="shrink-0">
          {saving ? 'Сохраняю' : 'Сохранить'}
        </Button>
      </div>
      {error ? (
        <p className="mt-2 text-[13px] leading-[18px] text-signal" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  )
}

function StreakCard({ streak }: { streak: StreakInfo }) {
  let message = 'Серия начнётся с первой сессии.'
  if (streak.current > 0) {
    message = streak.extendedToday
      ? 'Серия идёт: сегодня уже читали.'
      : 'Сегодня ещё не продлён — одна сессия сохранит серию.'
  } else if (streak.longest > 0) {
    message = 'Серия прервана — новая начнётся с сегодняшней сессии.'
  }

  return (
    <section className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-[22px] leading-[28px] font-medium">
          {streak.current > 0
            ? `${streak.current} ${pluralRu(streak.current, ['день', 'дня', 'дней'])} подряд`
            : 'Серия дней'}
        </h2>
        {streak.longest > 0 ? (
          <span className="shrink-0 text-[13px] leading-[18px] text-muted">
            лучшая — {streak.longest}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-[14px] leading-[20px] text-muted">{message}</p>

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
                {WEEKDAY_FORMAT.format(parseDay(day))}
              </span>
              <span className="sr-only">
                {formatDay(day)}: {active ? 'сессия была' : 'сессии не было'}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export function GoalScreen() {
  const anchor = today()
  const year = parseDay(anchor).getFullYear()

  const data = useLiveQuery(async () => {
    const [goal, finished] = await Promise.all([getGoal(year), countFinishedBooks(year)])
    return { goal: goal ?? null, finished }
  }, [year])

  const streak = useLiveQuery(() => getStreak(anchor), [anchor])

  return (
    <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
      <ScreenHeader title="Цель" caption={`${year} год`} back />

      {data === undefined ? (
        <div
          className="mt-6 h-72 animate-pulse rounded-[var(--radius-card)] bg-line/50"
          aria-hidden
        />
      ) : data.goal === null ? (
        <div className="mt-6">
          <EmptyState
            icon={<Target size={28} />}
            title={`Цель на ${year} год не задана`}
            description="Выберите, сколько книг хотите прочитать за год. Прогресс будет считаться автоматически."
            action={<GoalEditor year={year} initialTarget={12} hasGoal={false} />}
          />
        </div>
      ) : (
        <section className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <div className="flex flex-col items-center">
            <ProgressRing
              value={data.finished / data.goal.targetBooks}
              ariaLabel={`Прочитано ${data.finished} из ${data.goal.targetBooks} книг за ${year} год`}
            >
              <span className="font-display text-[34px] leading-[40px] font-medium tabular-nums">
                {Math.round(Math.min(data.finished / data.goal.targetBooks, 1) * 100)}%
              </span>
              <span className="mt-1 text-[13px] leading-[18px] text-muted">
                {data.finished} из {data.goal.targetBooks}
              </span>
            </ProgressRing>

            <p className="mt-4 text-center text-[14px] leading-[20px] text-muted">
              {data.finished >= data.goal.targetBooks
                ? 'Цель достигнута'
                : `Осталось ${data.goal.targetBooks - data.finished} ${pluralRu(
                    data.goal.targetBooks - data.finished,
                    ['книга', 'книги', 'книг'],
                  )}`}
            </p>
          </div>

          <GoalEditor
            key={data.goal.targetBooks}
            year={year}
            initialTarget={data.goal.targetBooks}
            hasGoal
          />
        </section>
      )}

      {streak === undefined ? (
        <div
          className="mt-6 h-36 animate-pulse rounded-[var(--radius-card)] bg-line/50"
          aria-hidden
        />
      ) : (
        <StreakCard streak={streak} />
      )}

      <p className="mt-6 text-[13px] leading-[18px] text-muted">
        Серия засчитывается, если за день есть минута чтения или хотя бы страница.
      </p>
    </div>
  )
}
