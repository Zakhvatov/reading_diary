import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { updateBook } from '@/db/repositories/books'
import type { Book, ProgressMode } from '@/db/types'
import { today } from '@/lib/dates'
import { finishBook } from '@/lib/progress'

type ProgressEditorProps = {
  book: Book
  onClose: () => void
}

const inputClass =
  'h-14 w-full rounded-[var(--radius-control)] border border-line bg-surface px-4 pr-14 text-[22px] leading-[28px] text-ink tabular-nums placeholder:text-muted/70'

const quickButtonClass =
  'h-10 rounded-[var(--radius-pill)] border border-line px-4 text-[14px] leading-[20px] text-ink active:bg-accent-soft'

function modeLabel(mode: ProgressMode): string {
  return mode === 'pages' ? 'Страницы' : 'Проценты'
}

export function ProgressEditor({ book, onClose }: ProgressEditorProps) {
  const [mode, setMode] = useState<ProgressMode>(book.progressMode)
  const [value, setValue] = useState(
    book.progressMode === 'pages' ? String(book.currentPage) : String(Math.round(book.percent)),
  )
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const limit = mode === 'percent' ? 100 : book.pageCount
  const unit = mode === 'percent' ? '%' : 'стр.'

  function setModeAndValue(next: ProgressMode) {
    setMode(next)
    setError('')
    setValue(next === 'percent' ? String(Math.round(book.percent)) : String(book.currentPage))
  }

  function bump(delta: number) {
    const current = Number(value) || 0
    const next = current + delta
    setValue(String(book.pageCount !== undefined ? Math.min(next, book.pageCount) : next))
    setError('')
  }

  function parseValue(): number | null {
    const raw = value.trim().replace(',', '.')

    if (raw === '') {
      setError('Введите значение')
      return null
    }

    const parsed = Number(raw)

    if (!Number.isFinite(parsed) || parsed < 0) {
      setError('Введите положительное число')
      return null
    }

    if (mode === 'pages' && !Number.isInteger(parsed)) {
      setError('Страница — целое число')
      return null
    }

    const rounded = Math.round(parsed)

    if (limit !== undefined && rounded > limit) {
      setError(limit === 100 ? 'Не больше 100%' : `В книге ${book.pageCount} стр.`)
      return null
    }

    return rounded
  }

  function startPatch(): Partial<Book> {
    if (book.status !== 'want') return {}
    return { status: 'reading', startedAt: book.startedAt ?? today() }
  }

  async function save() {
    const parsed = parseValue()
    if (parsed === null) return

    setBusy(true)

    try {
      if (mode === 'percent') {
        const patch: Partial<Book> = {
          progressMode: 'percent',
          percent: parsed,
          ...startPatch(),
        }

        if (parsed >= 100) {
          Object.assign(patch, finishBook(book, today()), { percent: 100 })
        }

        await updateBook(book.id, patch)
      } else {
        const patch: Partial<Book> = {
          progressMode: 'pages',
          currentPage: parsed,
          ...startPatch(),
        }

        if (book.pageCount !== undefined && parsed >= book.pageCount) {
          Object.assign(patch, finishBook(book, today()), { currentPage: parsed })
        }

        await updateBook(book.id, patch)
      }

      onClose()
    } finally {
      setBusy(false)
    }
  }

  async function markFinished() {
    setBusy(true)

    try {
      await updateBook(book.id, finishBook(book, today()))
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title="Прогресс">
      <div
        role="group"
        aria-label="Как считать прогресс"
        className="flex rounded-[var(--radius-pill)] bg-accent-soft p-1"
      >
        {(['pages', 'percent'] as const).map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={mode === item}
            onClick={() => setModeAndValue(item)}
            className={[
              'h-11 flex-1 rounded-[var(--radius-pill)] text-[14px] leading-[20px] font-medium',
              mode === item ? 'bg-surface text-ink' : 'text-muted',
            ].join(' ')}
          >
            {modeLabel(item)}
          </button>
        ))}
      </div>

      <label htmlFor="progress-value" className="mt-5 block text-[13px] leading-[18px] text-muted">
        {mode === 'percent' ? 'Прочитано' : 'Текущая страница'}
      </label>
      <div className="relative mt-1">
        <input
          id="progress-value"
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            setError('')
          }}
          inputMode="numeric"
          autoComplete="off"
          className={inputClass}
        />
        <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-[14px] leading-[20px] text-muted">
          {unit}
        </span>
      </div>

      {error ? <p className="mt-1 text-[13px] leading-[18px] text-signal">{error}</p> : null}

      {mode === 'pages' && book.pageCount !== undefined ? (
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => bump(10)} className={quickButtonClass}>
            +10
          </button>
          <button type="button" onClick={() => bump(25)} className={quickButtonClass}>
            +25
          </button>
          <span className="ml-auto self-center text-[13px] leading-[18px] text-muted">
            из {book.pageCount}
          </span>
        </div>
      ) : null}

      {mode === 'pages' && book.pageCount === undefined ? (
        <p className="mt-3 text-[13px] leading-[18px] text-muted">
          Количество страниц не указано — проценты считаться не будут.
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-3">
        <Button onClick={save} disabled={busy}>
          Сохранить
        </Button>
        {book.status !== 'finished' ? (
          <Button variant="ghost" onClick={markFinished} disabled={busy}>
            Отметить прочитанной
          </Button>
        ) : null}
      </div>
    </Sheet>
  )
}
