import { CaretDown, CaretUp, PencilSimple, Plus, Trash, BookOpen } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { createBookNote, deleteBookNote, updateBookNote } from '@/db/repositories/bookNotes'
import type { BookNote, ID } from '@/db/types'
import { DiaryEmpty, SectionHeader } from './SectionChrome'

const fieldClass =
  'mt-1 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 text-[16px] leading-[24px] text-ink placeholder:text-muted/70'

type PlotNoteListProps = {
  bookId: ID
  notes: BookNote[]
}

export function PlotNoteList({ bookId, notes }: PlotNoteListProps) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<BookNote | null>(null)
  const [pendingDelete, setPendingDelete] = useState<BookNote | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [moving, setMoving] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const ordered = [...notes].sort(
    (a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt),
  )
  const nextOrder = ordered.reduce((max, note) => Math.max(max, note.order + 1), 0)

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction
    const current = ordered[index]
    const other = ordered[target]
    if (!current || !other || moving) return

    const next = [...ordered]
    next[index] = other
    next[target] = current

    setMoving(true)

    try {
      await Promise.all(
        next.map((note, position) =>
          note.order === position ? null : updateBookNote(note.id, { order: position }),
        ),
      )
    } finally {
      setMoving(false)
    }
  }

  async function remove() {
    if (!pendingDelete) return

    setDeleting(true)
    setDeleteError(null)

    try {
      await deleteBookNote(pendingDelete.id)
      setPendingDelete(null)
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : 'Не удалось удалить заметку')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section>
      <SectionHeader
        title="Сюжет"
        count={notes.length}
        action={
          <Button variant="outline" onClick={() => setAdding(true)}>
            <Plus size={18} aria-hidden />
            Добавить
          </Button>
        }
      />

      {notes.length === 0 ? (
        <DiaryEmpty
          icon={<BookOpen size={24} />}
          title="Сюжет не записан"
          description="Короткие заметки по главам помогут вспомнить, что произошло."
          actionLabel="Добавить заметку"
          onAction={() => setAdding(true)}
        />
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {ordered.map((note, index) => (
            <li
              key={note.id}
              className="rounded-[var(--radius-card)] border border-line bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {note.chapter ? (
                    <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                      {note.chapter}
                    </p>
                  ) : null}
                  {note.title ? (
                    <p className="mt-0.5 font-display text-[18px] leading-[24px] font-medium">
                      {note.title}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(note)}
                  aria-label={note.title ? `Изменить «${note.title}»` : 'Изменить заметку'}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink active:bg-accent-soft"
                >
                  <PencilSimple size={18} aria-hidden />
                </button>
              </div>

              <p className="mt-2 text-[14px] leading-[21px] whitespace-pre-line">{note.body}</p>

              <div className="mt-1 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void move(index, -1)}
                    disabled={index === 0 || moving}
                    aria-label="Выше"
                    className="flex size-11 items-center justify-center rounded-full text-muted active:bg-accent-soft disabled:opacity-30"
                  >
                    <CaretUp size={18} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => void move(index, 1)}
                    disabled={index === ordered.length - 1 || moving}
                    aria-label="Ниже"
                    className="flex size-11 items-center justify-center rounded-full text-muted active:bg-accent-soft disabled:opacity-30"
                  >
                    <CaretDown size={18} aria-hidden />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null)
                    setPendingDelete(note)
                  }}
                  aria-label="Удалить заметку"
                  className="flex size-11 items-center justify-center rounded-full text-signal active:bg-signal-soft"
                >
                  <Trash size={18} aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {adding || editing ? (
        <PlotNoteSheet
          bookId={bookId}
          note={editing ?? undefined}
          order={nextOrder}
          onClose={() => {
            setAdding(false)
            setEditing(null)
          }}
        />
      ) : null}

      <Sheet
        open={Boolean(pendingDelete)}
        onClose={() => {
          if (!deleting) setPendingDelete(null)
        }}
        title="Удалить заметку?"
      >
        <p className="text-[15px] leading-[23px] text-muted">
          {pendingDelete?.title ? `«${pendingDelete.title}»` : 'Заметка'} исчезнет из сюжета.
        </p>
        {deleteError ? (
          <p role="alert" className="mt-3 text-[14px] leading-[20px] text-signal">
            {deleteError}
          </p>
        ) : null}
        <div className="mt-5 flex flex-col gap-3">
          <Button variant="danger" onClick={remove} disabled={deleting}>
            {deleting ? 'Удаляем…' : 'Удалить'}
          </Button>
          <Button variant="outline" onClick={() => setPendingDelete(null)} disabled={deleting}>
            Отмена
          </Button>
        </div>
      </Sheet>
    </section>
  )
}

type PlotNoteSheetProps = {
  bookId: ID
  note?: BookNote
  order: number
  onClose: () => void
}

function PlotNoteSheet({ bookId, note, order, onClose }: PlotNoteSheetProps) {
  const [chapter, setChapter] = useState(note?.chapter ?? '')
  const [title, setTitle] = useState(note?.title ?? '')
  const [body, setBody] = useState(note?.body ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = body.trim()
    if (!trimmed) {
      setError('Введите, что произошло')
      return
    }

    setBusy(true)
    setError(null)

    try {
      const chapterValue = chapter.trim() || undefined
      const titleValue = title.trim() || undefined

      if (note) {
        await updateBookNote(note.id, {
          chapter: chapterValue,
          title: titleValue,
          body: trimmed,
        })
      } else {
        await createBookNote({
          bookId,
          kind: 'plot',
          chapter: chapterValue,
          title: titleValue,
          body: trimmed,
          order,
        })
      }

      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось сохранить заметку')
      setBusy(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title={note ? 'Заметка по сюжету' : 'Новая заметка'}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[13px] leading-[18px] font-medium text-muted">Глава</span>
            <input
              value={chapter}
              onChange={(event) => setChapter(event.target.value)}
              disabled={busy}
              placeholder="Глава 7"
              autoComplete="off"
              className={`${fieldClass} h-12`}
            />
          </label>
          <label className="block">
            <span className="text-[13px] leading-[18px] font-medium text-muted">Название</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={busy}
              placeholder="Пожар"
              autoComplete="off"
              className={`${fieldClass} h-12`}
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="text-[13px] leading-[18px] font-medium text-muted">Что произошло</span>
          <textarea
            value={body}
            onChange={(event) => {
              setBody(event.target.value)
              setError(null)
            }}
            disabled={busy}
            rows={5}
            placeholder="Коротко, по делу"
            className={`${fieldClass} min-h-28 resize-y py-3`}
          />
        </label>

        <p className="mt-2 text-[13px] leading-[18px] text-muted">
          Порядок заметок меняется стрелками в списке.
        </p>

        {error ? (
          <p role="alert" className="mt-3 text-[14px] leading-[20px] text-signal">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? 'Сохраняем…' : 'Сохранить'}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Отмена
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
