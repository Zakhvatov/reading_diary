import { CaretDown } from '@phosphor-icons/react'
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { BookCover } from '@/components/book/BookCover'
import { ColorLabelPicker } from '@/components/diary/ColorLabelPicker'
import { TagInput } from '@/components/diary/TagInput'
import { Button } from '@/components/ui/Button'
import type {
  Acquisition,
  Book,
  BookFormat,
  BookStatus,
  ColorLabel,
  DiaryTemplateId,
} from '@/db/types'
import { ACQUISITION_LABELS, BOOK_FORMAT_LABELS } from '@/lib/bookMeta'
import { STATUS_LABELS, STATUS_OPTIONS } from '@/lib/bookStatus'
import { normalizeIsbn } from '@/lib/isbn'
import { DIARY_TEMPLATES } from '@/lib/templates'

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
  language?: string
  status: BookStatus
  tags: string[]
  moods: string[]
  format?: BookFormat
  acquisition?: Acquisition
  colorLabel: ColorLabel
  diaryTemplate: DiaryTemplateId
  shareable: boolean
}

type BookFormProps = {
  initial?: Book
  initialValues?: Partial<BookFormValues>
  coverPreviewUrl?: string
  defaultStatus?: BookStatus
  defaultTemplate?: DiaryTemplateId
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
  initialValues,
  coverPreviewUrl,
  defaultStatus,
  defaultTemplate,
  submitLabel,
  busy = false,
  error,
  onSubmit,
  onCancel,
}: BookFormProps) {
  const [title, setTitle] = useState(initial?.title ?? initialValues?.title ?? '')
  const [authors, setAuthors] = useState(
    initial?.authors.join(', ') ?? initialValues?.authors?.join(', ') ?? '',
  )
  const [genres, setGenres] = useState(
    initial?.genres.join(', ') ?? initialValues?.genres?.join(', ') ?? '',
  )
  const [pages, setPages] = useState(
    initial?.pageCount?.toString() ?? initialValues?.pageCount?.toString() ?? '',
  )
  const [year, setYear] = useState(
    initial?.publishedYear?.toString() ?? initialValues?.publishedYear?.toString() ?? '',
  )
  const [publisher, setPublisher] = useState(initial?.publisher ?? initialValues?.publisher ?? '')
  const [isbn, setIsbn] = useState(
    initial?.isbn13 ?? initial?.isbn10 ?? initialValues?.isbn13 ?? initialValues?.isbn10 ?? '',
  )
  const [note, setNote] = useState(initial?.description ?? initialValues?.description ?? '')
  const [status, setStatus] = useState<BookStatus>(
    initial?.status ?? initialValues?.status ?? defaultStatus ?? 'want',
  )
  const [language] = useState(initial?.language ?? initialValues?.language ?? '')
  const [tags, setTags] = useState(initial?.tags ?? initialValues?.tags ?? [])
  const [moods, setMoods] = useState(initial?.moods ?? initialValues?.moods ?? [])
  const [format, setFormat] = useState<BookFormat | ''>(
    initial?.format ?? initialValues?.format ?? '',
  )
  const [acquisition, setAcquisition] = useState<Acquisition | ''>(
    initial?.acquisition ?? initialValues?.acquisition ?? '',
  )
  const [colorLabel, setColorLabel] = useState<ColorLabel>(
    initial?.colorLabel ?? initialValues?.colorLabel ?? 'none',
  )
  const [template, setTemplate] = useState<DiaryTemplateId>(
    initial?.diaryTemplate ?? initialValues?.diaryTemplate ?? defaultTemplate ?? 'lite',
  )
  const [shareable, setShareable] = useState(
    initial?.shareable ?? initialValues?.shareable ?? false,
  )
  const [expanded, setExpanded] = useState(false)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [remoteCoverFailed, setRemoteCoverFailed] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const previewUrl = useMemo(() => (coverFile ? URL.createObjectURL(coverFile) : null), [coverFile])
  const shownCover = previewUrl ?? (remoteCoverFailed ? null : coverPreviewUrl) ?? null

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function validate(): Record<string, string> {
    const next: Record<string, string> = {}

    if (!title.trim()) next.title = 'Введите название'
    if (!authors.trim()) next.authors = 'Введите автора'
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
        language: language || undefined,
        status,
        tags,
        moods,
        format: format || undefined,
        acquisition: acquisition || undefined,
        colorLabel,
        diaryTemplate: template,
        shareable,
      },
      coverFile,
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6">
      <div className="flex items-start gap-4">
        <div className="relative aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-[10px]">
          <BookCover
            book={{
              title: title || 'Новая книга',
              authors: splitList(authors),
              coverId: initial?.coverId,
            }}
            className="absolute inset-0"
          />
          {shownCover ? (
            <img
              src={shownCover}
              alt=""
              onError={() => setRemoteCoverFailed(true)}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
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

      <Field label="Авторы" hint="Через запятую" error={errors.authors}>
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
          {STATUS_OPTIONS.map((value) => (
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

      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="mt-8 flex min-h-11 w-full items-center justify-between gap-3 border-t border-line pt-4 text-left"
      >
        <span>
          <span className="block text-[16px] leading-[22px] font-medium">Подробнее</span>
          <span className="block text-[13px] leading-[18px] text-muted">
            Теги, формат, ярлык и шаблон
          </span>
        </span>
        <CaretDown
          size={18}
          className={['shrink-0 text-muted', expanded ? 'rotate-180' : ''].join(' ')}
          aria-hidden
        />
      </button>

      {expanded ? (
        <div>
          <div className="mt-4">
            <span className="text-[13px] leading-[18px] font-medium text-muted">Теги</span>
            <TagInput
              value={tags}
              onChange={setTags}
              disabled={busy}
              placeholder="медленное чтение"
            />
          </div>

          <div className="mt-4">
            <span className="text-[13px] leading-[18px] font-medium text-muted">Настроения</span>
            <TagInput
              value={moods}
              onChange={setMoods}
              disabled={busy}
              placeholder="тихое"
              ariaLabel="Добавить настроение"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="mt-4 block">
              <span className="text-[13px] leading-[18px] font-medium text-muted">Формат</span>
              <select
                value={format}
                onChange={(event) => setFormat(event.target.value as BookFormat | '')}
                className={inputClass}
              >
                <option value="">Не указан</option>
                {(Object.keys(BOOK_FORMAT_LABELS) as BookFormat[]).map((value) => (
                  <option key={value} value={value}>
                    {BOOK_FORMAT_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-4 block">
              <span className="text-[13px] leading-[18px] font-medium text-muted">Откуда</span>
              <select
                value={acquisition}
                onChange={(event) => setAcquisition(event.target.value as Acquisition | '')}
                className={inputClass}
              >
                <option value="">Не указано</option>
                {(Object.keys(ACQUISITION_LABELS) as Acquisition[]).map((value) => (
                  <option key={value} value={value}>
                    {ACQUISITION_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4">
            <span className="text-[13px] leading-[18px] font-medium text-muted">Цветной ярлык</span>
            <div className="mt-1">
              <ColorLabelPicker value={colorLabel} onChange={setColorLabel} disabled={busy} />
            </div>
          </div>

          <label className="mt-4 block">
            <span className="text-[13px] leading-[18px] font-medium text-muted">
              Шаблон дневника
            </span>
            <select
              value={template}
              onChange={(event) => setTemplate(event.target.value as DiaryTemplateId)}
              className={inputClass}
            >
              {DIARY_TEMPLATES.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.title}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[13px] leading-[18px] text-muted">
              {DIARY_TEMPLATES.find((option) => option.id === template)?.description}
            </span>
          </label>

          <label className="mt-4 flex min-h-11 items-center justify-between gap-4">
            <span>
              <span className="block text-[15px] leading-[20px]">
                Разрешить в экспорте «Для других»
              </span>
              <span className="block text-[13px] leading-[18px] text-muted">
                Ничего не публикуется, это только фильтр.
              </span>
            </span>
            <input
              type="checkbox"
              checked={shareable}
              onChange={(event) => setShareable(event.target.checked)}
              className="size-5 shrink-0 accent-accent"
            />
          </label>
        </div>
      ) : null}

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
