import { CaretRight, CheckCircle } from '@phosphor-icons/react'
import { useEffect, useState, type FocusEvent } from 'react'
import { Link } from 'react-router-dom'
import { TemplatePicker } from '@/components/diary/TemplatePicker'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { useSettings } from '@/db/live'
import { requestPersistence, updateSettings } from '@/db/repositories/settings'
import type { RatingScale } from '@/db/types'
import { RATING_SCALE_LABELS } from '@/lib/bookMeta'
import { DEFAULT_MODE, DEFAULT_THEME, MODE_LABELS, THEMES, type ThemeMode } from '@/lib/theme'
import { formatDay, toDay } from '@/lib/dates'
import { formatBytes } from '@/lib/format'

const DAY_MS = 24 * 60 * 60 * 1000
const STALE_BACKUP_MS = 7 * DAY_MS

const rows = [
  {
    to: '/settings/backup',
    title: 'Резервная копия',
    description: 'Экспорт и импорт файла',
  },
  {
    to: '/about',
    title: 'О приложении',
    description: 'Версия и данные',
  },
]

type BackupState = { text: string; stale: boolean; detail?: string }

function backupState(lastBackupAt?: string): BackupState {
  if (!lastBackupAt) return { text: 'Бэкап не делался', stale: true }

  const time = Date.parse(lastBackupAt)
  if (!Number.isFinite(time)) return { text: 'Бэкап не делался', stale: true }

  const detail = `Последняя копия: ${formatDay(toDay(new Date(time)))}`
  if (Date.now() - time >= STALE_BACKUP_MS) {
    return { text: 'Бэкап старше 7 дней', stale: true, detail }
  }

  return { text: detail, stale: false }
}

function canPersist(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.storage?.persist === 'function'
}

function useStorageEstimate() {
  const [estimate, setEstimate] = useState<{ used: number; quota: number } | null>(null)

  useEffect(() => {
    const storage = typeof navigator === 'undefined' ? undefined : navigator.storage
    if (!storage?.estimate) return

    let cancelled = false

    storage.estimate().then(
      (value) => {
        if (!cancelled) setEstimate({ used: value.usage ?? 0, quota: value.quota ?? 0 })
      },
      () => {
        if (!cancelled) setEstimate(null)
      },
    )

    return () => {
      cancelled = true
    }
  }, [])

  return estimate
}

export function SettingsScreen() {
  const settings = useSettings()
  const estimate = useStorageEstimate()
  const [persisting, setPersisting] = useState(false)
  const [persistMessage, setPersistMessage] = useState<string | null>(null)
  const dailyGoal = settings?.dailyGoalMinutes

  const persistGranted = settings?.persistGranted ?? false
  const backup = backupState(settings?.lastBackupAt)

  async function saveGoal(event: FocusEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const parsed = Math.round(Number(input.value))
    const minutes = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 600) : 0

    input.value = String(minutes)

    if (minutes !== (settings?.dailyGoalMinutes ?? 0)) {
      await updateSettings({ dailyGoalMinutes: minutes })
    }
  }

  async function handlePersist() {
    setPersisting(true)
    setPersistMessage(null)

    try {
      const granted = await requestPersistence()
      if (!granted) setPersistMessage('Браузер не дал защиту от автоочистки.')
    } catch {
      setPersistMessage('Не удалось запросить защиту.')
    } finally {
      setPersisting(false)
    }
  }

  return (
    <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
      <ScreenHeader title="Настройки" caption="Приложение" hero />

      <section className="mt-8">
        <h2 className="font-display text-[20px] leading-[26px] font-medium">Оформление</h2>
        <p className="mt-2 text-[13px] leading-[18px] text-muted">
          Тема меняет главную, шрифты и всё оформление. У каждой есть светлый и тёмный вариант.
        </p>

        <div className="mt-4 overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
          {THEMES.map((theme) => {
            const active = (settings?.theme ?? DEFAULT_THEME) === theme.id
            return (
              <button
                key={theme.id}
                type="button"
                aria-pressed={active}
                disabled={!settings}
                onClick={() => void updateSettings({ theme: theme.id })}
                className={[
                  'flex w-full items-center gap-4 border-b border-line px-4 py-3 text-left last:border-b-0 active:bg-accent-soft disabled:opacity-60',
                  active ? 'bg-accent-soft/40' : '',
                ].join(' ')}
              >
                <span className={`theme-preview theme-preview-${theme.id}`} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] leading-[20px] font-medium text-ink">
                    {theme.name}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-[16px] text-muted">
                    {theme.description}
                  </span>
                </span>
                {active ? (
                  <CheckCircle size={20} aria-hidden className="shrink-0 text-accent" />
                ) : null}
              </button>
            )
          })}
        </div>

        <p className="mt-4 text-[14px] leading-[20px]">Режим</p>
        <div
          className="mt-2 grid grid-cols-3 gap-2"
          role="group"
          aria-label="Светлый или тёмный режим"
        >
          {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => {
            const active = (settings?.themeMode ?? DEFAULT_MODE) === mode
            return (
              <button
                key={mode}
                type="button"
                aria-pressed={active}
                disabled={!settings}
                onClick={() => void updateSettings({ themeMode: mode })}
                className={[
                  'h-11 rounded-[var(--radius-control)] px-2 text-[13px] font-medium disabled:opacity-60',
                  active ? 'bg-accent text-accent-ink' : 'border border-line bg-surface text-ink',
                ].join(' ')}
              >
                {MODE_LABELS[mode]}
              </button>
            )
          })}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-[20px] leading-[26px] font-medium">Данные</h2>
        <p className="mt-2 text-[13px] leading-[18px] text-muted">
          Книги, сессии и заметки хранятся в этом браузере. Ничего не уходит в сеть.
        </p>

        <div className="mt-4 overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
          <div className="border-b border-line px-5 py-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[14px] leading-[20px]">Занято</span>
              <span className="font-display text-[18px] leading-[24px] font-medium tabular-nums">
                {estimate ? formatBytes(estimate.used) : '—'}
              </span>
            </div>
            <p className="mt-1 text-[12px] leading-[16px] text-muted">
              {estimate && estimate.quota > 0
                ? `из ${formatBytes(estimate.quota)} доступно браузеру`
                : 'Браузер не сообщает объём хранилища'}
            </p>
          </div>

          <div className="border-b border-line px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] leading-[20px]">Защита от автоочистки</p>
                <p className="mt-1 text-[12px] leading-[16px] text-muted">
                  {persistGranted
                    ? 'Браузер не удалит данные при нехватке места.'
                    : 'Без защиты браузер может удалить данные при нехватке места.'}
                </p>
              </div>
              {persistGranted ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-[13px] leading-[18px] font-medium text-accent">
                  <CheckCircle size={16} aria-hidden /> Защищено
                </span>
              ) : canPersist() ? (
                <button
                  type="button"
                  onClick={handlePersist}
                  disabled={persisting}
                  className="min-h-11 shrink-0 rounded-[var(--radius-pill)] border border-line px-4 text-[14px] font-medium active:bg-accent-soft disabled:opacity-50"
                >
                  {persisting ? 'Запрашиваем…' : 'Защитить данные'}
                </button>
              ) : (
                <span className="shrink-0 text-[12px] leading-[16px] text-muted">Недоступно</span>
              )}
            </div>
            {persistMessage ? (
              <p className="mt-2 text-[12px] leading-[16px] text-muted">{persistMessage}</p>
            ) : null}
          </div>

          <div className="px-5 py-4">
            <p
              className={
                backup.stale
                  ? 'inline-flex rounded-full bg-butter px-3 py-1 text-[13px] leading-[18px] text-butter-ink'
                  : 'text-[13px] leading-[18px] text-muted'
              }
            >
              {backup.text}
            </p>
            {backup.detail ? (
              <p className="mt-1.5 text-[12px] leading-[16px] text-muted">{backup.detail}</p>
            ) : null}
          </div>
        </div>

        <p className="mt-4 text-[13px] leading-[18px] text-muted">
          Очистка данных Safari удалит дневник целиком — вместе с обложками и снимками. Единственная
          защита — файл резервной копии в Files или iCloud, сделанный раз в неделю.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-[20px] leading-[26px] font-medium">Дневник</h2>
        <p className="mt-2 text-[13px] leading-[18px] text-muted">
          Значения по умолчанию для новых книг.
        </p>

        <div className="mt-4 overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
          <div className="border-b border-line px-5 py-4">
            <label htmlFor="daily-goal" className="block text-[14px] leading-[20px]">
              Цель дня, минут
            </label>
            <p className="mt-1 text-[12px] leading-[16px] text-muted">0 — без цели.</p>
            <div className="mt-2 flex items-center gap-3">
              <input
                id="daily-goal"
                key={dailyGoal ?? 0}
                type="number"
                inputMode="numeric"
                min={0}
                max={600}
                defaultValue={dailyGoal ?? 0}
                onBlur={(event) => void saveGoal(event)}
                className="h-12 w-24 rounded-[var(--radius-control)] border border-line bg-surface px-3 text-[16px] text-ink tabular-nums"
              />
              <span className="text-[13px] leading-[18px] text-muted">минут в день</span>
            </div>
          </div>

          <div className="border-b border-line px-5 py-4">
            <p className="text-[14px] leading-[20px]">Шаблон по умолчанию</p>
            <p className="mt-1 text-[12px] leading-[16px] text-muted">
              Применяется к новой книге. У существующих остаётся свой.
            </p>
            <div className="mt-2">
              <TemplatePicker
                value={settings?.defaultTemplate ?? 'lite'}
                onChange={(defaultTemplate) => void updateSettings({ defaultTemplate })}
                disabled={!settings}
                showLabel={false}
                className="w-full justify-between"
              />
            </div>
          </div>

          <div className="px-5 py-4">
            <label htmlFor="default-rating-scale" className="block text-[14px] leading-[20px]">
              Шкала оценки по умолчанию
            </label>
            <p className="mt-1 text-[12px] leading-[16px] text-muted">
              С какой шкалы начинать оценку в дневнике.
            </p>
            <select
              id="default-rating-scale"
              value={settings?.defaultRatingScale ?? 'stars5'}
              onChange={(event) =>
                void updateSettings({ defaultRatingScale: event.target.value as RatingScale })
              }
              className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 text-[16px] text-ink"
            >
              {(Object.keys(RATING_SCALE_LABELS) as RatingScale[]).map((scale) => (
                <option key={scale} value={scale}>
                  {RATING_SCALE_LABELS[scale]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <nav className="mt-8 overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
        {rows.map((row) => (
          <Link
            key={row.to}
            to={row.to}
            className="flex min-h-[60px] items-center justify-between gap-4 border-b border-line px-5 py-3 last:border-b-0 active:bg-accent-soft"
          >
            <span>
              <span className="block text-[16px] leading-[22px]">{row.title}</span>
              <span className="block text-[13px] leading-[18px] text-muted">{row.description}</span>
            </span>
            <CaretRight size={18} className="shrink-0 text-muted" aria-hidden />
          </Link>
        ))}
      </nav>

      <p className="mt-6 text-[13px] leading-[18px] text-muted">Версия {__APP_VERSION__}</p>
    </div>
  )
}
