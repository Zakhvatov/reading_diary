import { CaretRight, Check, Notebook, PencilSimple, Star, StarHalf } from '@phosphor-icons/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BookCover } from '@/components/book/BookCover'
import { ProgressEditor } from '@/components/book/ProgressEditor'
import { QuoteList } from '@/components/book/QuoteList'
import { StatusChip } from '@/components/book/StatusChip'
import { ColorLabelDot } from '@/components/diary/ColorLabelPicker'
import { SessionList } from '@/components/session/SessionList'
import { SessionSheet } from '@/components/session/SessionSheet'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { Sheet } from '@/components/ui/Sheet'
import { SpineProgress } from '@/components/ui/SpineProgress'
import { useBook, useBookLinks, useBookNotes, useCharacters, useReadings } from '@/db/live'
import { deleteBook, updateBook } from '@/db/repositories/books'
import { listQuotesByBook } from '@/db/repositories/quotes'
import type { Book, BookStatus, Reading } from '@/db/types'
import { STATUS_LABELS, STATUS_OPTIONS } from '@/lib/bookStatus'
import { formatDay, today } from '@/lib/dates'
import { formatDuration, formatPercent, pluralRu } from '@/lib/format'
import { bookProgress, finishBook, setBookStatus } from '@/lib/progress'
import { formatRating, ratingFromStars, ratingToStars } from '@/lib/rating'

type SheetKind = 'status' | 'progress' | 'delete' | 'finish' | 'session' | null

const READING_STATUS_LABELS: Record<Reading['status'], string> = {
  reading: 'Читаю',
  finished: 'Прочитано',
  dnf: 'Брошено',
}

function readingDates(reading: Reading): string {
  const start = reading.startedAt ? formatDay(reading.startedAt) : undefined
  const finish = reading.finishedAt ? formatDay(reading.finishedAt) : undefined

  if (start && finish) return start === finish ? start : `${start} — ${finish}`
  if (start) return `с ${start}`
  if (finish) return `до ${finish}`
  return ''
}

function progressLabel(book: Book): string {
  if (book.progressMode === 'percent') {
    return `${Math.round(book.percent)}%`
  }
  if (book.pageCount) {
    return `${book.currentPage} из ${book.pageCount} стр.`
  }
  return `${book.currentPage} стр.`
}

type DiaryCounts = {
  quotes?: number
  characters?: number
  notes?: number
  links?: number
}

function diarySummary(counts: DiaryCounts): string {
  const parts: string[] = []

  if (counts.quotes) {
    parts.push(`${counts.quotes} ${pluralRu(counts.quotes, ['цитата', 'цитаты', 'цитат'])}`)
  }
  if (counts.characters) {
    parts.push(
      `${counts.characters} ${pluralRu(counts.characters, ['персонаж', 'персонажа', 'персонажей'])}`,
    )
  }
  if (counts.notes) {
    parts.push(`${counts.notes} ${pluralRu(counts.notes, ['заметка', 'заметки', 'заметок'])}`)
  }
  if (counts.links) {
    parts.push(`${counts.links} ${pluralRu(counts.links, ['связь', 'связи', 'связей'])}`)
  }

  return parts.length > 0 ? parts.join(' · ') : 'Персонажи, мысли и связи'
}

export function BookDetailScreen() {
  const { bookId } = useParams()
  const book = useBook(bookId)
  const readings = useReadings(bookId)
  const characters = useCharacters(bookId)
  const notes = useBookNotes(bookId)
  const links = useBookLinks(bookId)
  const quotes = useLiveQuery(() => (bookId ? listQuotesByBook(bookId) : []), [bookId])
  const navigate = useNavigate()
  const [sheet, setSheet] = useState<SheetKind>(null)
  const [busy, setBusy] = useState(false)
  const [finishRating, setFinishRating] = useState<number | undefined>(undefined)
  const [finishPage, setFinishPage] = useState('')
  const [finishError, setFinishError] = useState('')

  if (!book) {
    return (
      <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
        <ScreenHeader title="Книга" caption="Библиотека" back />
        <p className="mt-6 text-muted">Загрузка…</p>
      </div>
    )
  }

  const progress = bookProgress(book)

  async function changeStatus(status: BookStatus) {
    if (!book) return
    await updateBook(book.id, setBookStatus(book, status, today()))
    setSheet(null)
  }

  function openFinish() {
    if (!book) return
    setFinishRating(book.rating !== undefined ? ratingToStars(book.rating) : undefined)
    setFinishPage(book.pageCount !== undefined ? String(book.pageCount) : String(book.currentPage))
    setFinishError('')
    setSheet('finish')
  }

  async function finish() {
    if (!book) return

    const rawPage = finishPage.trim()
    const page = rawPage === '' ? undefined : Number(rawPage)

    if (page !== undefined && (!Number.isInteger(page) || page < 0)) {
      setFinishError('Введите целую страницу')
      return
    }

    if (page !== undefined && book.pageCount !== undefined && page > book.pageCount) {
      setFinishError(`В книге ${book.pageCount} стр.`)
      return
    }

    setBusy(true)

    try {
      const patch: Partial<Book> = {
        ...finishBook(book, today()),
        rating: finishRating !== undefined ? ratingFromStars(finishRating) : undefined,
        ratingScale: 'stars5',
      }
      if (page !== undefined) patch.currentPage = page

      await updateBook(book.id, patch)
      setSheet(null)
    } catch (caught) {
      setFinishError(caught instanceof Error ? caught.message : 'Не удалось завершить книгу')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!book) return
    setBusy(true)

    try {
      await deleteBook(book.id)
      navigate('/shelves', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  const details = [
    [book.publisher, book.publishedYear?.toString()].filter(Boolean).join(', '),
    book.pageCount ? `${book.pageCount} стр.` : '',
    book.isbn13 ? `ISBN ${book.isbn13}` : '',
  ].filter(Boolean)

  return (
    <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
      <ScreenHeader
        title={book.title}
        caption="Книга"
        back
        action={
          <Link
            to={`/books/${book.id}/edit`}
            aria-label="Редактировать книгу"
            className="flex size-11 items-center justify-center rounded-full text-muted active:bg-accent-soft"
          >
            <PencilSimple size={21} aria-hidden />
          </Link>
        }
      />

      <div className="mt-6 flex gap-4">
        <BookCover book={book} className="w-28 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setSheet('status')} aria-label="Изменить статус">
              <StatusChip status={book.status} />
            </button>
            {book.colorLabel !== 'none' ? <ColorLabelDot label={book.colorLabel} /> : null}
          </div>
          <p className="mt-2 text-[14px] leading-[20px] text-muted">
            {book.authors.join(', ') || 'Автор не указан'}
          </p>
          {book.rating !== undefined || book.emotion ? (
            <p className="mt-1 flex items-center gap-1.5 text-[13px] leading-[18px] text-muted">
              <Star size={14} weight="fill" className="text-accent" aria-hidden />
              {formatRating(book.rating, book.ratingScale, book.emotion)}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => setSheet('progress')}
            aria-label="Изменить прогресс"
            className="mt-4 block w-full text-left"
          >
            <SpineProgress value={progress} />
            <span className="mt-2 block text-[13px] leading-[18px] text-muted">
              {progressLabel(book)} · {formatPercent(progress)}
            </span>
          </button>
          {book.sessionCount > 0 ? (
            <p className="mt-1 text-[13px] leading-[18px] text-muted">
              {formatDuration(book.totalReadingMs)} · {book.sessionCount} сессий
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <Button to={`/timer?book=${book.id}`}>Продолжить</Button>
        {book.status !== 'finished' ? (
          <Button variant="outline" onClick={openFinish}>
            Дочитано
          </Button>
        ) : null}
      </div>

      <Link
        to={`/books/${book.id}/diary`}
        className="mt-6 flex min-h-16 items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface px-4 py-3 active:bg-accent-soft"
      >
        <Notebook size={22} className="shrink-0 text-accent" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-[16px] leading-[22px]">
            Дневник
            {book.colorLabel !== 'none' ? <ColorLabelDot label={book.colorLabel} /> : null}
          </span>
          <span className="mt-0.5 block text-[13px] leading-[18px] text-muted">
            {diarySummary({
              quotes: quotes?.length,
              characters: characters?.length,
              notes: notes?.length,
              links: links?.length,
            })}
          </span>
        </span>
        <CaretRight size={18} className="shrink-0 text-muted" aria-hidden />
      </Link>

      <section className="mt-8 border-t border-line pt-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Сессии</h2>
          <button
            type="button"
            onClick={() => setSheet('session')}
            className="text-[14px] leading-[20px] text-accent"
          >
            Добавить
          </button>
        </div>
        <SessionList bookId={book.id} pageCount={book.pageCount} />
      </section>

      {readings && readings.length > 0 ? (
        <section className="mt-8 border-t border-line pt-5">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            История чтения
          </h2>
          <ul className="mt-2 flex flex-col gap-2">
            {[...readings].reverse().map((reading) => (
              <li
                key={reading.id}
                className="flex items-baseline justify-between gap-3 text-[14px] leading-[20px]"
              >
                <span>{READING_STATUS_LABELS[reading.status]}</span>
                <span className="shrink-0 text-[13px] leading-[18px] text-muted tabular-nums">
                  {readingDates(reading)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-6">
        <QuoteList book={book} />
      </div>

      {details.length > 0 || book.genres.length > 0 ? (
        <section className="mt-8 border-t border-line pt-5">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            Издание
          </h2>
          {details.map((line) => (
            <p key={line} className="mt-2 text-[14px] leading-[20px]">
              {line}
            </p>
          ))}
          {book.genres.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {book.genres.map((genre) => (
                <span
                  key={genre}
                  className="rounded-[var(--radius-pill)] bg-accent-soft px-3 py-1 text-[12px] leading-[18px]"
                >
                  {genre}
                </span>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {book.description ? (
        <section className="mt-6 border-t border-line pt-5">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            Заметка
          </h2>
          <p className="mt-2 whitespace-pre-line text-[15px] leading-[23px]">{book.description}</p>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setSheet('delete')}
        className="mt-10 text-[14px] leading-[20px] text-signal"
      >
        Удалить книгу
      </button>

      {sheet === 'progress' ? <ProgressEditor book={book} onClose={() => setSheet(null)} /> : null}

      <Sheet open={sheet === 'status'} onClose={() => setSheet(null)} title="Статус книги">
        <div className="flex flex-col">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => changeStatus(status)}
              className="flex min-h-12 items-center justify-between rounded-[var(--radius-control)] px-2 text-left text-[16px] active:bg-accent-soft"
            >
              <span>{STATUS_LABELS[status]}</span>
              {book.status === status ? (
                <Check size={18} className="text-accent" aria-hidden />
              ) : null}
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={sheet === 'delete'} onClose={() => setSheet(null)} title="Удалить книгу?">
        <p className="text-[15px] leading-[23px] text-muted">
          Книга, сессии, цитаты и связанные записи удалятся без возможности отменить.
        </p>
        <div className="mt-5 flex flex-col gap-3">
          <Button variant="danger" onClick={remove} disabled={busy}>
            {busy ? 'Удаляем…' : 'Удалить'}
          </Button>
          <Button variant="outline" onClick={() => setSheet(null)}>
            Отмена
          </Button>
        </div>
      </Sheet>

      <Sheet open={sheet === 'finish'} onClose={() => setSheet(null)} title="Дочитано">
        <p className="text-[14px] leading-[20px] text-muted">Дата: {formatDay(today())}</p>

        <div className="mt-4">
          <span className="text-[13px] leading-[18px] font-medium text-muted">Оценка</span>
          <div className="mt-1 flex items-center gap-1" role="group" aria-label="Оценка книги">
            {[1, 2, 3, 4, 5].map((value) => {
              const diff = finishRating === undefined ? 0 : finishRating - (value - 1)
              const filled = diff >= 1
              const half = !filled && diff >= 0.5

              return (
                <button
                  key={value}
                  type="button"
                  aria-label={`Оценка ${value}`}
                  aria-pressed={finishRating === value}
                  onClick={() => setFinishRating(finishRating === value ? undefined : value)}
                  className={[
                    'flex size-11 items-center justify-center rounded-full active:bg-accent-soft',
                    filled || half ? 'text-accent' : 'text-muted/40',
                  ].join(' ')}
                >
                  {half ? (
                    <StarHalf size={26} weight="fill" aria-hidden />
                  ) : (
                    <Star size={26} weight={filled ? 'fill' : 'regular'} aria-hidden />
                  )}
                </button>
              )
            })}
            {finishRating !== undefined ? (
              <button
                type="button"
                onClick={() => setFinishRating(undefined)}
                className="ml-1 h-11 text-[13px] leading-[18px] text-muted"
              >
                Без оценки
              </button>
            ) : null}
          </div>
        </div>

        <label className="mt-4 block">
          <span className="text-[13px] leading-[18px] font-medium text-muted">
            Финальная страница
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={finishPage}
            onChange={(event) => {
              setFinishPage(event.target.value)
              setFinishError('')
            }}
            className="mt-1 h-12 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 text-[16px] text-ink tabular-nums"
          />
          {book.pageCount ? (
            <span className="mt-1 block text-[12px] leading-[16px] text-muted">
              В книге {book.pageCount} стр. По умолчанию — последняя страница.
            </span>
          ) : null}
        </label>

        {finishError ? (
          <p role="alert" className="mt-2 text-[13px] leading-[18px] text-signal">
            {finishError}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3">
          <Button onClick={finish} disabled={busy}>
            {busy ? 'Сохраняем…' : 'Завершить книгу'}
          </Button>
          <Button variant="outline" onClick={() => setSheet(null)}>
            Отмена
          </Button>
        </div>
      </Sheet>

      {sheet === 'session' ? (
        <SessionSheet book={book} title="Новая сессия" onClose={() => setSheet(null)} />
      ) : null}
    </div>
  )
}
