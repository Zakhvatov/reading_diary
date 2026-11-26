import { DotsThree } from '@phosphor-icons/react'
import { useState } from 'react'
import { useSessionsByBook } from '@/db/live'
import { deleteSession, updateSession } from '@/db/repositories/sessions'
import type { ID, Session } from '@/db/types'
import { formatDay } from '@/lib/dates'
import { formatDuration } from '@/lib/format'

type SessionListProps = {
  bookId: ID
  pageCount?: number
}

const smallButton =
  'h-10 rounded-[var(--radius-pill)] border border-line px-4 text-[14px] leading-[20px] text-ink active:bg-accent-soft disabled:opacity-50'

const smallDangerButton =
  'h-10 rounded-[var(--radius-pill)] bg-signal px-4 text-[14px] leading-[20px] text-on-signal active:opacity-90 disabled:opacity-50'

const editInput =
  'mt-1 h-11 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 text-[15px] text-ink tabular-nums placeholder:text-muted/70'

function durationLabel(session: Session): string {
  return session.durationMs > 1 ? formatDuration(session.durationMs) : 'Без времени'
}

function pagesLabel(session: Session): string {
  if (session.startPage !== undefined && session.endPage !== undefined) {
    return `с ${session.startPage} по ${session.endPage}`
  }
  if (session.endPage !== undefined) {
    return `до ${session.endPage} стр.`
  }
  if (session.pagesRead > 0) {
    return `${session.pagesRead} стр.`
  }
  return 'Без страниц'
}

function parsePage(raw: string): number | undefined | null {
  if (raw.trim() === '') return undefined

  const value = Number(raw)
  if (!Number.isInteger(value) || value < 0) return null

  return value
}

function SessionRow({ session, pageCount }: { session: Session; pageCount?: number }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [minutes, setMinutes] = useState(
    session.durationMs > 1 ? String(Math.max(1, Math.round(session.durationMs / 60_000))) : '',
  )
  const [startPage, setStartPage] = useState(
    session.startPage !== undefined ? String(session.startPage) : '',
  )
  const [endPage, setEndPage] = useState(
    session.endPage !== undefined ? String(session.endPage) : '',
  )
  const [note, setNote] = useState(session.note ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function openEditor() {
    setMenuOpen(false)
    setEditing(true)
  }

  async function saveEdit() {
    const minutesNumber = minutes.trim() === '' ? null : Number(minutes)

    if (minutesNumber !== null && (!Number.isInteger(minutesNumber) || minutesNumber <= 0)) {
      setError('Длительность — целые минуты больше нуля')
      return
    }

    const start = parsePage(startPage)
    const end = parsePage(endPage)

    if (start === null || end === null) {
      setError('Страницы — целые неотрицательные числа')
      return
    }

    if (pageCount !== undefined) {
      if ((start !== undefined && start > pageCount) || (end !== undefined && end > pageCount)) {
        setError(`В книге ${pageCount} стр.`)
        return
      }
    }

    if (start !== undefined && end !== undefined && end < start) {
      setError('Конечная страница меньше начальной')
      return
    }

    if (minutesNumber === null && session.durationMs > 1) {
      setError('Укажите длительность')
      return
    }

    const durationMs =
      minutesNumber === null ? session.durationMs : Math.round(minutesNumber * 60_000)
    const endedAt = new Date(new Date(session.startedAt).getTime() + durationMs).toISOString()
    const pagesRead = start !== undefined && end !== undefined ? Math.max(0, end - start) : 0

    setBusy(true)
    setError('')

    try {
      await updateSession(session.id, {
        durationMs,
        endedAt,
        pagesRead,
        startPage: start,
        endPage: end,
        note: note.trim() || undefined,
      })
      setEditing(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось сохранить сессию')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    setError('')

    try {
      await deleteSession(session.id)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось удалить сессию')
      setBusy(false)
    }
  }

  return (
    <li className="border-b border-line/70 py-3 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[14px] leading-[20px]">{formatDay(session.day)}</p>
          <p className="mt-0.5 text-[13px] leading-[18px] text-muted">
            {durationLabel(session)} · {pagesLabel(session)}
          </p>
          {session.note ? (
            <p className="mt-1 line-clamp-2 text-[13px] leading-[18px] text-muted">
              {session.note}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Действия с сессией"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="-mt-1 flex size-11 shrink-0 items-center justify-center rounded-full text-muted active:bg-accent-soft"
        >
          <DotsThree size={22} weight="bold" aria-hidden />
        </button>
      </div>

      {menuOpen ? (
        <div className="mt-1 flex gap-2">
          <button type="button" onClick={openEditor} className={smallButton}>
            Изменить
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false)
              setConfirmDelete(true)
            }}
            className={`${smallButton} text-signal`}
          >
            Удалить
          </button>
        </div>
      ) : null}

      {confirmDelete ? (
        <div className="mt-2 rounded-[var(--radius-control)] bg-signal-soft px-3 py-3">
          <p className="text-[14px] leading-[20px] text-signal">Удалить сессию?</p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={remove} disabled={busy} className={smallDangerButton}>
              {busy ? 'Удаляем…' : 'Удалить'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              disabled={busy}
              className={smallButton}
            >
              Отмена
            </button>
          </div>
        </div>
      ) : null}

      {editing ? (
        <div className="mt-3 rounded-[var(--radius-control)] border border-line px-3 py-3">
          <div className="grid grid-cols-3 gap-2">
            <label className="block">
              <span className="text-[12px] leading-[16px] text-muted">Минуты</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={minutes}
                placeholder="—"
                onChange={(event) => {
                  setMinutes(event.target.value)
                  setError('')
                }}
                className={editInput}
              />
            </label>
            <label className="block">
              <span className="text-[12px] leading-[16px] text-muted">С</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={startPage}
                onChange={(event) => {
                  setStartPage(event.target.value)
                  setError('')
                }}
                className={editInput}
              />
            </label>
            <label className="block">
              <span className="text-[12px] leading-[16px] text-muted">По</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={endPage}
                onChange={(event) => {
                  setEndPage(event.target.value)
                  setError('')
                }}
                className={editInput}
              />
            </label>
          </div>

          <label className="mt-2 block">
            <span className="text-[12px] leading-[16px] text-muted">Заметка</span>
            <textarea
              value={note}
              rows={2}
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
              className="mt-1 w-full resize-none rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-[15px] leading-[22px] text-ink placeholder:text-muted/70"
            />
          </label>

          {error ? (
            <p role="alert" className="mt-2 text-[13px] leading-[18px] text-signal">
              {error}
            </p>
          ) : null}

          <div className="mt-2 flex gap-2">
            <button type="button" onClick={saveEdit} disabled={busy} className={smallButton}>
              {busy ? 'Сохраняем…' : 'Сохранить'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false)
                setError('')
              }}
              disabled={busy}
              className={smallButton}
            >
              Отмена
            </button>
          </div>
        </div>
      ) : null}
    </li>
  )
}

export function SessionList({ bookId, pageCount }: SessionListProps) {
  const sessions = useSessionsByBook(bookId)

  if (sessions === undefined) {
    return <p className="mt-3 text-[14px] leading-[20px] text-muted">Загрузка…</p>
  }

  if (sessions.length === 0) {
    return <p className="mt-3 text-[14px] leading-[20px] text-muted">Пока нет сессий.</p>
  }

  return (
    <ul className="mt-1">
      {sessions.map((session) => (
        <SessionRow key={session.id} session={session} pageCount={pageCount} />
      ))}
    </ul>
  )
}
