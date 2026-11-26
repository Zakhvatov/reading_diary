import { LinkSimple, PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { createBookLink, deleteBookLink, updateBookLink } from '@/db/repositories/bookLinks'
import type { Book, BookLink, BookLinkKind, ID } from '@/db/types'
import { BOOK_LINK_KIND_LABELS } from '@/lib/bookMeta'
import { DiaryEmpty, SectionHeader } from './SectionChrome'

const fieldClass =
  'mt-1 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 text-[16px] leading-[24px] text-ink placeholder:text-muted/70'

const LINK_KINDS: BookLinkKind[] = ['similar', 'sequel', 'prequel', 'same-world', 'other']

type BookLinkListProps = {
  bookId: ID
  links: BookLink[]
  books: Book[]
}

export function BookLinkList({ bookId, links, books }: BookLinkListProps) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<BookLink | null>(null)
  const [pendingDelete, setPendingDelete] = useState<BookLink | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function remove() {
    if (!pendingDelete) return

    setDeleting(true)
    setDeleteError(null)

    try {
      await deleteBookLink(pendingDelete.id)
      setPendingDelete(null)
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : 'Не удалось удалить связь')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section>
      <SectionHeader
        title="Связи"
        count={links.length}
        action={
          <Button variant="outline" onClick={() => setAdding(true)}>
            <Plus size={18} aria-hidden />
            Добавить
          </Button>
        }
      />

      {links.length === 0 ? (
        <DiaryEmpty
          icon={<LinkSimple size={24} />}
          title="Связей пока нет"
          description="Отметьте похожие книги, продолжения и истории в том же мире."
          actionLabel="Добавить связь"
          onAction={() => setAdding(true)}
        />
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {links.map((link) => (
            <li
              key={link.id}
              className="rounded-[var(--radius-card)] border border-line bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                    {BOOK_LINK_KIND_LABELS[link.kind]}
                  </p>
                  {link.targetBookId ? (
                    <Link
                      to={`/books/${link.targetBookId}`}
                      className="mt-0.5 block font-display text-[18px] leading-[24px] font-medium text-accent"
                    >
                      {link.targetTitle}
                    </Link>
                  ) : (
                    <p className="mt-0.5 font-display text-[18px] leading-[24px] font-medium">
                      {link.targetTitle}
                    </p>
                  )}
                  {link.note ? (
                    <p className="mt-1 text-[14px] leading-[20px] whitespace-pre-line text-muted">
                      {link.note}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(link)}
                    aria-label={`Изменить связь «${link.targetTitle}»`}
                    className="flex size-11 items-center justify-center rounded-full text-ink active:bg-accent-soft"
                  >
                    <PencilSimple size={18} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(null)
                      setPendingDelete(link)
                    }}
                    aria-label={`Удалить связь «${link.targetTitle}»`}
                    className="flex size-11 items-center justify-center rounded-full text-signal active:bg-signal-soft"
                  >
                    <Trash size={18} aria-hidden />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {adding || editing ? (
        <BookLinkSheet
          bookId={bookId}
          link={editing ?? undefined}
          books={books}
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
        title="Удалить связь?"
      >
        <p className="text-[15px] leading-[23px] text-muted">
          {pendingDelete ? `«${pendingDelete.targetTitle}» исчезнет из связей.` : ''}
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

type BookLinkSheetProps = {
  bookId: ID
  link?: BookLink
  books: Book[]
  onClose: () => void
}

function BookLinkSheet({ bookId, link, books, onClose }: BookLinkSheetProps) {
  const [targetBookId, setTargetBookId] = useState(link?.targetBookId ?? '')
  const [targetTitle, setTargetTitle] = useState(link?.targetTitle ?? '')
  const [kind, setKind] = useState<BookLinkKind>(link?.kind ?? 'similar')
  const [note, setNote] = useState(link?.note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const options = books.filter((book) => book.id !== bookId)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const title = targetTitle.trim()
    if (!title) {
      setError('Выберите книгу или введите название')
      return
    }

    setBusy(true)
    setError(null)

    try {
      const payload = {
        targetBookId: targetBookId || undefined,
        targetTitle: title,
        kind,
        note: note.trim() || undefined,
      }

      if (link) {
        await updateBookLink(link.id, payload)
      } else {
        await createBookLink({ bookId, ...payload })
      }

      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось сохранить связь')
      setBusy(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title={link ? 'Связь' : 'Новая связь'}>
      <form onSubmit={handleSubmit} noValidate>
        {options.length > 0 ? (
          <label className="block">
            <span className="text-[13px] leading-[18px] font-medium text-muted">
              Книга из библиотеки
            </span>
            <select
              value={targetBookId}
              disabled={busy}
              onChange={(event) => {
                const value = event.target.value
                setTargetBookId(value)
                const picked = options.find((book) => book.id === value)
                if (picked) setTargetTitle(picked.title)
              }}
              className={`${fieldClass} h-12 bg-surface`}
            >
              <option value="">Своё название</option>
              {options.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="mt-4 block">
          <span className="text-[13px] leading-[18px] font-medium text-muted">Название</span>
          <input
            value={targetTitle}
            onChange={(event) => {
              setTargetTitle(event.target.value)
              setTargetBookId('')
              setError(null)
            }}
            disabled={busy}
            placeholder="Книга, с которой есть связь"
            autoComplete="off"
            className={`${fieldClass} h-12`}
          />
        </label>

        <label className="mt-4 block">
          <span className="text-[13px] leading-[18px] font-medium text-muted">Тип связи</span>
          <select
            value={kind}
            disabled={busy}
            onChange={(event) => setKind(event.target.value as BookLinkKind)}
            className={`${fieldClass} h-12 bg-surface`}
          >
            {LINK_KINDS.map((value) => (
              <option key={value} value={value}>
                {BOOK_LINK_KIND_LABELS[value]}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block">
          <span className="text-[13px] leading-[18px] font-medium text-muted">Заметка</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={busy}
            rows={2}
            placeholder="Чем связаны"
            className={`${fieldClass} resize-y py-3`}
          />
        </label>

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
