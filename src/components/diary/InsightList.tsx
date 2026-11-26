import { Lightbulb, PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { createBookNote, deleteBookNote, updateBookNote } from '@/db/repositories/bookNotes'
import type { BookNote, ID } from '@/db/types'
import { DiaryEmpty, SectionHeader } from './SectionChrome'
import { TagInput } from './TagInput'

const fieldClass =
  'mt-1 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 text-[16px] leading-[24px] text-ink placeholder:text-muted/70'

type InsightListProps = {
  bookId: ID
  notes: BookNote[]
}

export function InsightList({ bookId, notes }: InsightListProps) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<BookNote | null>(null)
  const [pendingDelete, setPendingDelete] = useState<BookNote | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const ordered = [...notes].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const suggestions = Array.from(new Set(notes.flatMap((note) => note.tags))).sort((a, b) =>
    a.localeCompare(b, 'ru'),
  )
  const nextOrder = ordered.reduce((max, note) => Math.max(max, note.order + 1), 0)

  async function remove() {
    if (!pendingDelete) return

    setDeleting(true)
    setDeleteError(null)

    try {
      await deleteBookNote(pendingDelete.id)
      setPendingDelete(null)
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : 'Не удалось удалить мысль')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section>
      <SectionHeader
        title="Мысли"
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
          icon={<Lightbulb size={24} />}
          title="Пока нет мыслей"
          description="Записывайте наблюдения, вопросы и то, что зацепило."
          actionLabel="Добавить мысль"
          onAction={() => setAdding(true)}
        />
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {ordered.map((note) => (
            <li
              key={note.id}
              className="rounded-[var(--radius-card)] border border-line bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 text-[14px] leading-[21px] whitespace-pre-line">
                  {note.body}
                </p>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(note)}
                    aria-label="Изменить мысль"
                    className="flex size-11 items-center justify-center rounded-full text-ink active:bg-accent-soft"
                  >
                    <PencilSimple size={18} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(null)
                      setPendingDelete(note)
                    }}
                    aria-label="Удалить мысль"
                    className="flex size-11 items-center justify-center rounded-full text-signal active:bg-signal-soft"
                  >
                    <Trash size={18} aria-hidden />
                  </button>
                </div>
              </div>

              {note.tags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {note.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex min-h-7 items-center rounded-[var(--radius-pill)] border border-line px-2.5 text-[13px] leading-[18px] text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {adding || editing ? (
        <InsightSheet
          bookId={bookId}
          note={editing ?? undefined}
          order={nextOrder}
          suggestions={suggestions}
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
        title="Удалить мысль?"
      >
        <p className="line-clamp-3 text-[15px] leading-[23px] text-muted">
          {pendingDelete?.body ?? ''}
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

type InsightSheetProps = {
  bookId: ID
  note?: BookNote
  order: number
  suggestions: string[]
  onClose: () => void
}

function InsightSheet({ bookId, note, order, suggestions, onClose }: InsightSheetProps) {
  const [body, setBody] = useState(note?.body ?? '')
  const [tags, setTags] = useState<string[]>(note?.tags ?? [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = body.trim()
    if (!trimmed) {
      setError('Введите мысль')
      return
    }

    setBusy(true)
    setError(null)

    try {
      if (note) {
        await updateBookNote(note.id, { body: trimmed, tags })
      } else {
        await createBookNote({ bookId, kind: 'insight', body: trimmed, tags, order })
      }

      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось сохранить мысль')
      setBusy(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title={note ? 'Мысль' : 'Новая мысль'}>
      <form onSubmit={handleSubmit} noValidate>
        <label className="block">
          <span className="text-[13px] leading-[18px] font-medium text-muted">Мысль</span>
          <textarea
            value={body}
            onChange={(event) => {
              setBody(event.target.value)
              setError(null)
            }}
            disabled={busy}
            rows={5}
            placeholder="Что зацепило и почему"
            className={`${fieldClass} min-h-28 resize-y py-3`}
          />
        </label>

        <div className="mt-4">
          <span className="text-[13px] leading-[18px] font-medium text-muted">Теги</span>
          <TagInput
            value={tags}
            onChange={setTags}
            suggestions={suggestions}
            disabled={busy}
            placeholder="медленное чтение"
          />
        </div>

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
