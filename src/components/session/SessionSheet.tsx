import { format } from 'date-fns'
import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { addSession } from '@/db/repositories/sessions'
import type { Book, Session } from '@/db/types'
import { toDay } from '@/lib/dates'
import { MAX_SESSION_MS, needsTrim } from '@/lib/timer'

export type SessionSheetMode = 'timer' | 'pages' | 'manual'

export type SessionSheetInitial = {
  mode?: SessionSheetMode
  startedAt?: string
  durationMs?: number
  startPage?: number
  endPage?: number
  note?: string
}

type SessionSheetProps = {
  book: Book
  initial?: SessionSheetInitial
  title?: string
  onClose: () => void
  onSaved?: (session: Session) => void
}

const MODES: { id: SessionSheetMode; label: string; dot: string }[] = [
  { id: 'timer', label: 'Таймер', dot: 'bg-accent' },
  { id: 'pages', label: 'Только страницы', dot: 'bg-sky-ink' },
  { id: 'manual', label: 'Вручную', dot: 'bg-muted' },
]

/** Сессия «только страницы» не учитывает время; длительность 0 допустима. */
const PAGES_ONLY_MS = 0

const inputClass =
  'mt-1 h-12 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 text-[16px] text-ink tabular-nums placeholder:text-muted/70'

type FieldProps = {
  label: string
  hint?: string
  children: ReactNode
}

function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="mt-4 block">
      <span className="text-[13px] leading-[18px] font-medium text-muted">{label}</span>
      {children}
      {hint ? (
        <span className="mt-1 block text-[12px] leading-[16px] text-muted">{hint}</span>
      ) : null}
    </label>
  )
}

function localDateTime(value: Date): string {
  return format(value, "yyyy-MM-dd'T'HH:mm")
}

function splitDuration(ms: number): { hours: string; minutes: string } {
  const totalMinutes = ms <= 0 ? 0 : Math.max(1, Math.round(ms / 60_000))
  const capped = Math.min(totalMinutes, MAX_SESSION_MS / 60_000)

  return {
    hours: String(Math.floor(capped / 60)),
    minutes: String(capped % 60),
  }
}

function parsePage(raw: string): number | undefined | null {
  if (raw.trim() === '') return undefined

  const value = Number(raw)
  if (!Number.isInteger(value) || value < 0) return null

  return value
}

export function SessionSheet({
  book,
  initial,
  title = 'Сессия',
  onClose,
  onSaved,
}: SessionSheetProps) {
  const initialDuration = initial?.durationMs ?? 0
  const initialParts = splitDuration(initialDuration)

  const [mode, setMode] = useState<SessionSheetMode>(initial?.mode ?? 'manual')
  const [hours, setHours] = useState(initialParts.hours)
  const [minutes, setMinutes] = useState(initialParts.minutes)
  const [startPage, setStartPage] = useState(
    initial?.startPage !== undefined ? String(initial.startPage) : '',
  )
  const [endPage, setEndPage] = useState(
    initial?.endPage !== undefined ? String(initial.endPage) : '',
  )
  const [note, setNote] = useState(initial?.note ?? '')
  const [dateValue, setDateValue] = useState(() =>
    localDateTime(initial?.startedAt ? new Date(initial.startedAt) : new Date()),
  )
  const [trimmedWarning, setTrimmedWarning] = useState(needsTrim(initialDuration))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function changeMode(next: SessionSheetMode) {
    setMode(next)
    setError('')
  }

  function validate(): {
    durationMs: number
    startedAt: string
    endedAt?: string
    startPage?: number
    endPage?: number
    pagesRead: number
  } | null {
    let durationMs = PAGES_ONLY_MS

    if (mode !== 'pages') {
      const hoursNumber = hours.trim() === '' ? 0 : Number(hours)
      const minutesNumber = minutes.trim() === '' ? 0 : Number(minutes)

      if (
        !Number.isInteger(hoursNumber) ||
        !Number.isInteger(minutesNumber) ||
        hoursNumber < 0 ||
        minutesNumber < 0 ||
        minutesNumber > 59
      ) {
        setError('Длительность — целые часы и минуты от 0 до 59')
        return null
      }

      durationMs = (hoursNumber * 60 + minutesNumber) * 60_000

      if (durationMs <= 0) {
        setError('Укажите длительность')
        return null
      }

      if (durationMs > MAX_SESSION_MS) {
        setError('Сессия не может быть длиннее 12 часов')
        return null
      }
    }

    const start = parsePage(startPage)
    const end = parsePage(endPage)

    if (start === null || end === null) {
      setError('Страницы — целые неотрицательные числа')
      return null
    }

    if (book.pageCount !== undefined) {
      if (
        (start !== undefined && start > book.pageCount) ||
        (end !== undefined && end > book.pageCount)
      ) {
        setError(`В книге ${book.pageCount} стр.`)
        return null
      }
    }

    const effectiveStart = start ?? (end !== undefined ? book.currentPage : undefined)

    if (end !== undefined) {
      if (effectiveStart !== undefined && end < effectiveStart) {
        setError('Конечная страница меньше начальной')
        return null
      }
    }

    if (mode === 'pages' && end === undefined) {
      setError('Укажите конечную страницу')
      return null
    }

    const pagesRead =
      effectiveStart !== undefined && end !== undefined ? Math.max(0, end - effectiveStart) : 0

    let startedAt: string
    let endedAt: string | undefined

    if (mode === 'manual') {
      const parsedDate = new Date(dateValue)

      if (!dateValue || Number.isNaN(parsedDate.getTime())) {
        setError('Укажите дату и время')
        return null
      }

      if (parsedDate.getTime() > Date.now()) {
        setError('Дата не может быть в будущем')
        return null
      }

      startedAt = parsedDate.toISOString()
    } else {
      startedAt = initial?.startedAt ?? new Date().toISOString()
    }

    if (mode === 'timer') {
      endedAt = new Date().toISOString()
    }

    return {
      durationMs,
      startedAt,
      endedAt,
      startPage: effectiveStart,
      endPage: end,
      pagesRead,
    }
  }

  async function save() {
    const parsed = validate()
    if (!parsed) return

    setBusy(true)
    setError('')

    try {
      const session = await addSession({
        bookId: book.id,
        startedAt: parsed.startedAt,
        endedAt: parsed.endedAt,
        day: toDay(new Date(parsed.startedAt)),
        durationMs: parsed.durationMs,
        pagesRead: parsed.pagesRead,
        startPage: parsed.startPage,
        endPage: parsed.endPage,
        kind: mode === 'timer' ? 'timer' : 'manual',
        note: note.trim() || undefined,
      })

      onSaved?.(session)
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось сохранить сессию')
      setBusy(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title={title}>
      <div className="max-h-[calc(85dvh-150px)] overflow-y-auto pr-1">
        <div
          role="group"
          aria-label="Как записать сессию"
          className="flex rounded-[var(--radius-pill)] bg-accent-soft p-1"
        >
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={mode === item.id}
              onClick={() => changeMode(item.id)}
              className={[
                'flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-pill)] px-1 text-[12px] leading-[15px] font-medium',
                mode === item.id ? 'bg-surface text-ink' : 'text-muted',
              ].join(' ')}
            >
              <span className={`size-1.5 shrink-0 rounded-full ${item.dot}`} aria-hidden />
              {item.label}
            </button>
          ))}
        </div>

        {mode !== 'pages' && trimmedWarning ? (
          <p className="mt-3 rounded-[var(--radius-control)] bg-signal-soft px-3 py-2 text-[13px] leading-[18px] text-signal">
            Сессия длиннее 12 часов. Время обрезано до 12:00 — поправьте, если нужно.
          </p>
        ) : null}

        {mode === 'manual' ? (
          <Field label="Когда читали">
            <input
              type="datetime-local"
              value={dateValue}
              max={localDateTime(new Date())}
              onChange={(event) => {
                setDateValue(event.target.value)
                setError('')
              }}
              className={inputClass}
            />
          </Field>
        ) : null}

        {mode !== 'pages' ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[13px] leading-[18px] font-medium text-muted">Часы</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={12}
                value={hours}
                placeholder="0"
                onChange={(event) => {
                  setHours(event.target.value)
                  setTrimmedWarning(false)
                  setError('')
                }}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-[13px] leading-[18px] font-medium text-muted">Минуты</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={59}
                value={minutes}
                placeholder="0"
                onChange={(event) => {
                  setMinutes(event.target.value)
                  setTrimmedWarning(false)
                  setError('')
                }}
                className={inputClass}
              />
            </label>
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field label="Страница с">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={startPage}
              placeholder={String(book.currentPage)}
              onChange={(event) => {
                setStartPage(event.target.value)
                setError('')
              }}
              className={inputClass}
            />
          </Field>
          <Field label="Страница по">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={endPage}
              placeholder={book.pageCount ? String(book.pageCount) : ''}
              onChange={(event) => {
                setEndPage(event.target.value)
                setError('')
              }}
              className={inputClass}
            />
          </Field>
        </div>

        {book.pageCount ? (
          <p className="mt-1 text-[12px] leading-[16px] text-muted">
            В книге {book.pageCount} стр.
          </p>
        ) : null}

        <Field label="Заметка">
          <textarea
            value={note}
            rows={3}
            maxLength={500}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Что запомнилось"
            className="mt-1 w-full resize-none rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-[16px] leading-[24px] text-ink placeholder:text-muted/70"
          />
        </Field>

        {error ? (
          <p role="alert" className="mt-3 text-[13px] leading-[18px] text-signal">
            {error}
          </p>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <Button onClick={save} disabled={busy}>
          {busy ? 'Сохраняем…' : 'Сохранить сессию'}
        </Button>
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Отмена
        </Button>
      </div>
    </Sheet>
  )
}
