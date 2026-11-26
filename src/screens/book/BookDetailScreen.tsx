import { Check, PencilSimple } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BookCover } from '@/components/book/BookCover'
import { ProgressEditor } from '@/components/book/ProgressEditor'
import { StatusChip } from '@/components/book/StatusChip'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { Sheet } from '@/components/ui/Sheet'
import { SpineProgress } from '@/components/ui/SpineProgress'
import { useBook, useReadings } from '@/db/live'
import { deleteBook, updateBook } from '@/db/repositories/books'
import type { Book, BookStatus, Reading } from '@/db/types'
import { BOOK_STATUSES, STATUS_LABELS } from '@/lib/bookStatus'
import { formatDay, today } from '@/lib/dates'
import { formatDuration, formatPercent } from '@/lib/format'
import { bookProgress, finishBook, setBookStatus } from '@/lib/progress'

type SheetKind = 'status' | 'progress' | 'delete' | null

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

export function BookDetailScreen() {
  const { bookId } = useParams()
  const book = useBook(bookId)
  const readings = useReadings(bookId)
  const navigate = useNavigate()
  const [sheet, setSheet] = useState<SheetKind>(null)
  const [busy, setBusy] = useState(false)

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

  async function markFinished() {
    if (!book) return
    await updateBook(book.id, finishBook(book, today()))
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
          <button type="button" onClick={() => setSheet('status')} aria-label="Изменить статус">
            <StatusChip status={book.status} />
          </button>
          <p className="mt-2 text-[14px] leading-[20px] text-muted">
            {book.authors.join(', ') || 'Автор не указан'}
          </p>
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
          <Button variant="outline" onClick={markFinished}>
            Дочитано
          </Button>
        ) : null}
      </div>

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
          {BOOK_STATUSES.map((status) => (
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
    </div>
  )
}
