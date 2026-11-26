import { useLiveQuery } from 'dexie-react-hooks'
import {
  CaretDown,
  Check,
  Image as ImageIcon,
  ListBullets,
  MagnifyingGlass,
  TextB,
  TextHTwo,
  TextItalic,
} from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { useBlocker, useNavigate, useParams } from 'react-router-dom'
import { JOURNAL_COLORS, JOURNAL_COLOR_STYLES } from '@/components/journal/colors'
import { JournalPhoto } from '@/components/journal/JournalPhoto'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { Sheet } from '@/components/ui/Sheet'
import { useBooks } from '@/db/live'
import { createJournal, deleteJournal, getJournal, updateJournal } from '@/db/repositories/journals'
import { deleteCover, saveCover } from '@/db/repositories/covers'
import type { Book, JournalColor, JournalEntry } from '@/db/types'
import { formatAuthors } from '@/lib/authors'
import { today } from '@/lib/dates'
import { fileToCover } from '@/lib/image'
import { renderMarkdown } from '@/lib/markdown'
import { normalizeText } from '@/lib/text'

const fieldBase =
  'mt-1 h-12 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 text-ink placeholder:text-muted/70'
const inputClass = `${fieldBase} text-[16px]`

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mt-5 block">
      <span className="text-[13px] leading-[18px] font-medium text-muted">{label}</span>
      {children}
    </label>
  )
}

function ToolbarButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-11 items-center justify-center rounded-[10px] text-ink active:bg-accent-soft disabled:opacity-50"
    >
      {children}
    </button>
  )
}

type BookPickerProps = {
  books: Book[]
  selectedId?: string
  onSelect: (id?: string) => void
  onClose: () => void
}

function BookPickerSheet({ books, selectedId, onSelect, onClose }: BookPickerProps) {
  const [query, setQuery] = useState('')
  const search = normalizeText(query)
  const found = search
    ? books.filter((book) =>
        normalizeText([book.title, ...book.authors].join(' ')).includes(search),
      )
    : books

  function choose(id?: string) {
    onSelect(id)
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title="Книга">
      <div className="relative">
        <MagnifyingGlass
          size={18}
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Поиск по библиотеке"
          placeholder="Название или автор"
          className="h-12 w-full rounded-[var(--radius-pill)] border border-line bg-surface pr-4 pl-11 text-[16px] text-ink placeholder:text-muted focus-visible:border-accent focus-visible:outline-none"
        />
      </div>

      <div className="mt-3 flex max-h-[50dvh] flex-col overflow-y-auto">
        <button
          type="button"
          onClick={() => choose(undefined)}
          className="flex min-h-12 items-center justify-between gap-3 rounded-[var(--radius-control)] px-2 text-left text-[16px] active:bg-accent-soft"
        >
          <span>Без книги</span>
          {selectedId ? null : <Check size={18} className="text-accent" aria-hidden />}
        </button>

        {found.map((book) => (
          <button
            key={book.id}
            type="button"
            onClick={() => choose(book.id)}
            className="flex min-h-12 items-center justify-between gap-3 rounded-[var(--radius-control)] px-2 py-2 text-left active:bg-accent-soft"
          >
            <span className="min-w-0">
              <span className="block truncate text-[16px] leading-[22px]">{book.title}</span>
              <span className="block truncate text-[13px] leading-[18px] text-muted">
                {formatAuthors(book.authors, true)}
              </span>
            </span>
            {selectedId === book.id ? (
              <Check size={18} className="shrink-0 text-accent" aria-hidden />
            ) : null}
          </button>
        ))}

        {books.length === 0 ? (
          <p className="px-2 py-3 text-[14px] leading-[20px] text-muted">
            В библиотеке пока нет книг.
          </p>
        ) : null}
        {books.length > 0 && found.length === 0 ? (
          <p className="px-2 py-3 text-[14px] leading-[20px] text-muted">Ничего не найдено.</p>
        ) : null}
      </div>
    </Sheet>
  )
}

type JournalEditorProps = {
  entry?: JournalEntry
  books: Book[]
  lastReading?: Book
}

function JournalEditor({ entry, books, lastReading }: JournalEditorProps) {
  const navigate = useNavigate()
  const [entryId, setEntryId] = useState(entry?.id)
  const [title, setTitle] = useState(entry?.title ?? '')
  const [body, setBody] = useState(entry?.body ?? '')
  const [entryDate, setEntryDate] = useState(entry?.entryDate ?? today())
  const [color, setColor] = useState<JournalColor>(entry?.color ?? 'pine')
  const [bookId, setBookId] = useState<string | undefined>(entry ? entry.bookId : lastReading?.id)
  const [bookPickerOpen, setBookPickerOpen] = useState(false)
  const [mode, setMode] = useState<'write' | 'preview'>('write')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [exitTo, setExitTo] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const book = books.find((item) => item.id === bookId)
  const hasPhoto = Boolean(photoFile) || Boolean(entry?.photoId && !photoRemoved)
  const previewUrl = useMemo(() => (photoFile ? URL.createObjectURL(photoFile) : null), [photoFile])

  const currentSnapshot = JSON.stringify({
    title,
    body,
    entryDate,
    color,
    bookId: bookId ?? '',
    photo: photoFile
      ? `${photoFile.name}:${photoFile.size}`
      : photoRemoved
        ? 'removed'
        : (entry?.photoId ?? ''),
  })
  const [baseline, setBaseline] = useState(() => currentSnapshot)
  const isDirty = currentSnapshot !== baseline
  const blocker = useBlocker(isDirty)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  useEffect(() => {
    if (!isDirty) return

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  useEffect(() => {
    if (exitTo) navigate(exitTo, { replace: true })
  }, [exitTo, navigate])

  function writeBody(next: string, start: number, end = start) {
    flushSync(() => setBody(next))
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.focus()
    textarea.setSelectionRange(start, end)
  }

  function wrapSelection(marker: string) {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = textarea.value.slice(start, end)
    const next = `${textarea.value.slice(0, start)}${marker}${selected}${marker}${textarea.value.slice(end)}`
    writeBody(next, start + marker.length, start + marker.length + selected.length)
  }

  function prefixLines(prefix: string) {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.value.lastIndexOf('\n', textarea.selectionStart - 1) + 1
    const breakIndex = textarea.value.indexOf('\n', textarea.selectionEnd)
    const end = breakIndex === -1 ? textarea.value.length : breakIndex
    const block = textarea.value.slice(start, end)
    const lines = block.split('\n')
    const already =
      block.length > 0 && lines.every((line) => line.length === 0 || line.startsWith(prefix))
    const nextBlock = lines
      .map((line) => {
        if (!line) return line
        return already ? line.slice(prefix.length) : `${prefix}${line}`
      })
      .join('\n')

    writeBody(
      `${textarea.value.slice(0, start)}${nextBlock}${textarea.value.slice(end)}`,
      start + nextBlock.length,
    )
  }

  function pickPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setPhotoError('Выберите изображение')
      return
    }

    setPhotoError(null)
    setPhotoFile(file)
    setPhotoRemoved(false)
  }

  function removePhoto() {
    if (photoFile) {
      setPhotoFile(null)
      return
    }
    setPhotoRemoved(true)
  }

  async function handleSave() {
    const trimmedTitle = title.trim()
    if (!trimmedTitle && !body.trim()) {
      setError('Добавьте заголовок или текст')
      return
    }

    setBusy(true)
    setError(null)

    const date = entryDate || today()
    const input = { title: trimmedTitle, body, color, entryDate: date, bookId }

    try {
      let id = entryId
      if (!id) {
        const created = await createJournal(input)
        id = created.id
        setEntryId(created.id)
      }

      let nextPhotoId = photoRemoved ? undefined : entry?.photoId
      if (photoFile) {
        const image = await fileToCover(photoFile, 1600, 900)
        const cover = await saveCover({
          ownerType: 'journal',
          ownerId: id,
          blob: image.blob,
          width: image.width,
          height: image.height,
        })
        nextPhotoId = cover.id
      }

      await updateJournal(id, { ...input, photoId: nextPhotoId })

      if (entry?.photoId && (photoFile || photoRemoved)) {
        await deleteCover(entry.photoId)
      }

      setBaseline(currentSnapshot)
      setExitTo(`/journals/${id}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось сохранить запись')
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!entry) return

    setBusy(true)
    setError(null)

    try {
      await deleteJournal(entry.id)
      setDeleteOpen(false)
      setBaseline(currentSnapshot)
      setExitTo('/journals')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось удалить запись')
      setBusy(false)
    }
  }

  return (
    <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
      <ScreenHeader title={entry ? 'Запись' : 'Новая запись'} caption="Дневник" back />

      <Field label="Заголовок">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={busy}
          className={`${fieldBase} font-display text-[22px] leading-[28px]`}
          placeholder="О чём запись"
          autoComplete="off"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Дата">
          <input
            type="date"
            value={entryDate}
            onChange={(event) => setEntryDate(event.target.value)}
            disabled={busy}
            className={inputClass}
          />
        </Field>

        <div className="mt-5">
          <span className="text-[13px] leading-[18px] font-medium text-muted">Книга</span>
          <button
            type="button"
            onClick={() => setBookPickerOpen(true)}
            disabled={busy}
            className={`${inputClass} flex items-center justify-between gap-3 text-left`}
          >
            <span className={book ? 'truncate' : 'truncate text-muted'}>
              {book?.title ?? 'Без книги'}
            </span>
            <CaretDown size={18} className="shrink-0 text-muted" aria-hidden />
          </button>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[13px] leading-[18px] font-medium text-muted">Цвет</p>
        <div role="radiogroup" aria-label="Цвет записи" className="mt-2 flex gap-2">
          {JOURNAL_COLORS.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={color === value}
              aria-label={JOURNAL_COLOR_STYLES[value].label}
              onClick={() => setColor(value)}
              disabled={busy}
              className={[
                'flex size-11 items-center justify-center rounded-full',
                JOURNAL_COLOR_STYLES[value].swatch,
                color === value ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {color === value ? <Check size={18} className="text-paper" aria-hidden /> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[13px] leading-[18px] font-medium text-muted">Фото</p>
        {hasPhoto ? (
          <div className="mt-2 overflow-hidden rounded-[var(--radius-card)]">
            {previewUrl ? (
              <img src={previewUrl} alt="" className="h-40 w-full object-cover" />
            ) : entry?.photoId && !photoRemoved ? (
              <JournalPhoto
                photoId={entry.photoId}
                alt="Фото к записи"
                className="h-40 w-full object-cover"
              />
            ) : null}
          </div>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-pill)] border border-line bg-surface px-4 text-[14px] font-medium">
            <ImageIcon size={18} aria-hidden />
            {hasPhoto ? 'Заменить фото' : 'Добавить фото'}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={busy}
              onChange={pickPhoto}
            />
          </label>
          {hasPhoto ? (
            <button
              type="button"
              onClick={removePhoto}
              disabled={busy}
              className="min-h-11 text-[13px] leading-[18px] text-signal"
            >
              Убрать фото
            </button>
          ) : null}
        </div>
        {photoError ? (
          <p className="mt-1 text-[13px] leading-[18px] text-signal">{photoError}</p>
        ) : null}
      </div>

      <section className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] leading-[18px] font-medium text-muted">Текст</p>
          <div className="flex items-center rounded-[var(--radius-pill)] border border-line bg-surface p-0.5">
            <button
              type="button"
              onClick={() => setMode('write')}
              aria-pressed={mode === 'write'}
              className={[
                'flex h-8 items-center rounded-[var(--radius-pill)] px-3 text-[13px] font-medium',
                mode === 'write' ? 'bg-accent text-accent-ink' : 'text-muted',
              ].join(' ')}
            >
              Писать
            </button>
            <button
              type="button"
              onClick={() => setMode('preview')}
              aria-pressed={mode === 'preview'}
              className={[
                'flex h-8 items-center rounded-[var(--radius-pill)] px-3 text-[13px] font-medium',
                mode === 'preview' ? 'bg-accent text-accent-ink' : 'text-muted',
              ].join(' ')}
            >
              Просмотр
            </button>
          </div>
        </div>

        {mode === 'write' ? (
          <>
            <div className="mt-2 flex flex-wrap items-center gap-1 rounded-t-[var(--radius-control)] border border-b-0 border-line bg-surface px-1 py-1">
              <ToolbarButton label="Заголовок" onClick={() => prefixLines('## ')} disabled={busy}>
                <TextHTwo size={19} aria-hidden />
              </ToolbarButton>
              <ToolbarButton label="Жирный" onClick={() => wrapSelection('**')} disabled={busy}>
                <TextB size={19} aria-hidden />
              </ToolbarButton>
              <ToolbarButton label="Курсив" onClick={() => wrapSelection('*')} disabled={busy}>
                <TextItalic size={19} aria-hidden />
              </ToolbarButton>
              <ToolbarButton label="Список" onClick={() => prefixLines('- ')} disabled={busy}>
                <ListBullets size={19} aria-hidden />
              </ToolbarButton>
            </div>
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              disabled={busy}
              rows={10}
              placeholder="Что запомнилось, что зацепило"
              className="min-h-[240px] w-full resize-y rounded-b-[var(--radius-control)] border border-line bg-surface px-4 py-3 text-[16px] leading-[26px] text-ink placeholder:text-muted/70"
            />
          </>
        ) : (
          <div className="mt-2 min-h-[140px] rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3">
            {renderMarkdown(body) ?? <p className="text-[15px] text-muted">Пока пусто</p>}
          </div>
        )}
      </section>

      {error ? (
        <p role="alert" className="mt-4 text-[14px] leading-[20px] text-signal">
          {error}
        </p>
      ) : null}

      <Button onClick={handleSave} disabled={busy} className="mt-6 w-full">
        {busy ? 'Сохраняем…' : 'Сохранить'}
      </Button>

      {entry ? (
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          disabled={busy}
          className="mt-8 min-h-11 text-[14px] leading-[20px] text-signal"
        >
          Удалить запись
        </button>
      ) : null}

      {bookPickerOpen ? (
        <BookPickerSheet
          books={books}
          selectedId={bookId}
          onSelect={setBookId}
          onClose={() => setBookPickerOpen(false)}
        />
      ) : null}

      <Sheet
        open={blocker.state === 'blocked'}
        onClose={() => blocker.state === 'blocked' && blocker.reset()}
        title="Выйти без сохранения?"
      >
        <p className="text-[15px] leading-[23px] text-muted">
          В записи есть несохранённые изменения. Они пропадут.
        </p>
        <div className="mt-5 flex flex-col gap-3">
          <Button variant="danger" onClick={() => blocker.state === 'blocked' && blocker.proceed()}>
            Выйти
          </Button>
          <Button variant="outline" onClick={() => blocker.state === 'blocked' && blocker.reset()}>
            Остаться
          </Button>
        </div>
      </Sheet>

      <Sheet open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Удалить запись?">
        <p className="text-[15px] leading-[23px] text-muted">
          Запись и её фото удалятся без возможности отменить.
        </p>
        <div className="mt-5 flex flex-col gap-3">
          <Button variant="danger" onClick={handleDelete} disabled={busy}>
            {busy ? 'Удаляем…' : 'Удалить'}
          </Button>
          <Button variant="outline" onClick={() => setDeleteOpen(false)}>
            Отмена
          </Button>
        </div>
      </Sheet>
    </div>
  )
}

export function JournalEditorScreen() {
  const { journalId } = useParams()
  const isNew = !journalId || journalId === 'new'
  const entry = useLiveQuery(async () => {
    if (isNew || !journalId) return null
    return (await getJournal(journalId)) ?? null
  }, [isNew, journalId])
  const books = useBooks()
  const reading = useBooks('reading')

  if (books === undefined || (isNew && reading === undefined) || (!isNew && entry === undefined)) {
    return (
      <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
        <ScreenHeader title={isNew ? 'Новая запись' : 'Запись'} caption="Дневник" back />
        <p className="mt-6 text-muted">Загрузка…</p>
      </div>
    )
  }

  if (!isNew && entry === null) {
    return (
      <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
        <ScreenHeader title="Запись" caption="Дневник" back />
        <p className="mt-6 text-muted">Запись не найдена.</p>
      </div>
    )
  }

  return (
    <JournalEditor
      key={entry?.id ?? 'new'}
      entry={entry ?? undefined}
      books={books}
      lastReading={reading?.[0]}
    />
  )
}
