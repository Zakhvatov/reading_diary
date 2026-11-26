import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { BookCover } from '@/components/book/BookCover'
import { Button } from '@/components/ui/Button'
import type { Book, BookStatus } from '@/db/types'
import { BOOK_STATUSES, STATUS_LABELS } from '@/lib/bookStatus'
import { normalizeIsbn } from '@/lib/isbn'

export type BookFormValues = {
  title: string
  authors: string[]
  genres: string[]
  pageCount?: number
  publishedYear?: number
  publisher?: string
  isbn13?: string
  isbn10?: string
  description?: string
  status: BookStatus
}

type BookFormProps = {
  initial?: Book
  defaultStatus?: BookStatus
  submitLabel: string
  busy?: boolean
  error?: string | null
  onSubmit: (values: BookFormValues, coverFile: File | null) => Promise<void>
  onCancel?: () => void
}

const inputClass =
  'mt-1 h-12 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 text-[16px] text-ink placeholder:text-muted/70'

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

type FieldProps = {
  label: string
  error?: string
  hint?: string
  children: ReactNode
}

function Field({ label, error, hint, children }: FieldProps) {
  return (
    <label className="mt-4 block">
      <span className="text-[13px] leading-[18px] font-medium text-muted">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-[13px] leading-[18px] text-signal">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[13px] leading-[18px] text-muted">{hint}</span>
      ) : null}
    </label>
  )
}

export function BookForm({
  initial,
  defaultStatus,
  submitLabel,
  busy = false,
  error,
  onSubmit,
  onCancel,
}: BookFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [authors, setAuthors] = useState(initial?.authors.join(', ') ?? '')
  const [genres, setGenres] = useState(initial?.genres.join(', ') ?? '')
  const [pages, setPages] = useState(initial?.pageCount?.toString() ?? '')
  const [year, setYear] = useState(initial?.publishedYear?.toString() ?? '')
  const [publisher, setPublisher] = useState(initial?.publisher ?? '')
  const [isbn, setIsbn] = useState(initial?.isbn13 ?? initial?.isbn10 ?? '')
  const [note, setNote] = useState(initial?.description ?? '')
  const [status, setStatus] = useState<BookStatus>(initial?.status ?? defaultStatus ?? 'want')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const previewUrl = useMemo(() => (coverFile ? URL.createObjectURL(coverFile) : null), [coverFile])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function validate(): Record<string, string> {
    const next: Record<string, string> = {}

    if (!title.trim()) next.title = 'Введите название'
    if (pages && (!/^\d+$/.test(pages) || Number(pages) <= 0)) {
      next.pages = 'Только целое число'
    }
    if (year && (!/^\d{4}$/.test(year) || Number(year) < 1000 || Number(year) > 2100)) {
      next.year = 'Год от 1000 до 2100'
    }
    if (isbn.trim() && !normalizeIsbn(isbn)) {
      next.isbn = 'Проверьте ISBN'
    }

    return next
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    const normalizedIsbn = isbn.trim() ? normalizeIsbn(isbn) : null

    await onSubmit(
      {
        title: title.trim(),
        authors: splitList(authors),
        genres: splitList(genres),
        pageCount: pages ? Number(pages) : undefined,
        publishedYear: year ? Number(year) : undefined,
        publisher: publisher.trim() || undefined,
        isbn13: normalizedIsbn?.isbn13,
        isbn10: normalizedIsbn?.isbn10,
        description: note.trim() || undefined,
        status,
      },
      coverFile,
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6">
      <div className="flex items-center gap-4">
        <div className="w-24 shrink-0">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt=""
              className="aspect-[2/3] w-full rounded-[10px] object-cover"
            />
          ) : (
            <BookCover
              book={{
                title: title || 'Новая книга',
                authors: splitList(authors),
                coverId: initial?.coverId,
              }}
            />
          )}
        </div>
        <div className="min-w-0">
          <label className="inline-flex h-11 cursor-pointer items-center rounded-[var(--radius-pill)] border border-line bg-surface px-4 text-[14px] font-medium active:scale-[0.98]">
            {coverFile ? 'Другая обложка' : 'Обложка'}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <p className="mt-2 text-[13px] leading-[18px] text-muted">
            Фото обрежется до пропорции 2:3.
          </p>
          {coverFile ? (
            <button
              type="button"
              onClick={() => setCoverFile(null)}
              className="mt-2 text-[13px] leading-[18px] text-signal"
            >
              Убрать
            </button>
          ) : null}
        </div>
      </div>

      <Field label="Название" error={errors.title}>
        <input
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className={inputClass}
          placeholder="Мастер и Маргарита"
          autoComplete="off"
        />
      </Field>

      <Field label="Авторы" hint="Через запятую">
        <input
          name="authors"
          value={authors}
          onChange={(event) => setAuthors(event.target.value)}
          className={inputClass}
          placeholder="Михаил Булгаков"
          autoComplete="off"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Страниц" error={errors.pages}>
          <input
            name="pageCount"
            value={pages}
            onChange={(event) => setPages(event.target.value)}
            className={inputClass}
            inputMode="numeric"
            placeholder="416"
          />
        </Field>
        <Field label="Год" error={errors.year}>
          <input
            name="publishedYear"
            value={year}
            onChange={(event) => setYear(event.target.value)}
            className={inputClass}
            inputMode="numeric"
            placeholder="1967"
          />
        </Field>
      </div>

      <Field label="Издательство">
        <input
          name="publisher"
          value={publisher}
          onChange={(event) => setPublisher(event.target.value)}
          className={inputClass}
          placeholder="АСТ"
          autoComplete="off"
        />
      </Field>

      <Field label="ISBN" error={errors.isbn} hint="Можно с дефисами">
        <input
          name="isbn"
          value={isbn}
          onChange={(event) => setIsbn(event.target.value)}
          className={inputClass}
          inputMode="numeric"
          placeholder="978-5-17-090258-3"
        />
      </Field>

      <Field label="Жанры" hint="Через запятую">
        <input
          name="genres"
          value={genres}
          onChange={(event) => setGenres(event.target.value)}
          className={inputClass}
          placeholder="Роман, классика"
          autoComplete="off"
        />
      </Field>

      <Field label="Статус">
        <select
          name="status"
          value={status}
          onChange={(event) => setStatus(event.target.value as BookStatus)}
          className={inputClass}
        >
          {BOOK_STATUSES.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Заметка">
        <textarea
          name="description"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className={`${inputClass} h-24 py-3`}
          placeholder="Почему хочется прочитать"
        />
      </Field>

      {error ? (
        <p role="alert" className="mt-4 text-[14px] leading-[20px] text-signal">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={busy} className="mt-6 w-full">
        {busy ? 'Сохраняем…' : submitLabel}
      </Button>

      {onCancel ? (
        <Button variant="ghost" onClick={onCancel} className="mt-2 w-full">
          Отмена
        </Button>
      ) : null}
    </form>
  )
}
