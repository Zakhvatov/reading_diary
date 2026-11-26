import { PencilSimple, Star } from '@phosphor-icons/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BookCover } from '@/components/book/BookCover'
import { QuoteList } from '@/components/book/QuoteList'
import { StatusChip } from '@/components/book/StatusChip'
import { BookLinkList } from '@/components/diary/BookLinkList'
import { CharacterList } from '@/components/diary/CharacterList'
import { ColorLabelDot } from '@/components/diary/ColorLabelPicker'
import { InsightList } from '@/components/diary/InsightList'
import { PlotNoteList } from '@/components/diary/PlotNoteList'
import { RatingInput } from '@/components/diary/RatingInput'
import { TemplatePicker } from '@/components/diary/TemplatePicker'
import { DiaryExport } from '@/components/export/DiaryExport'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { Sheet } from '@/components/ui/Sheet'
import {
  useBook,
  useBookLinks,
  useBookNotes,
  useBooks,
  useCharacters,
  useReadings,
} from '@/db/live'
import { updateBook } from '@/db/repositories/books'
import { listQuotesByBook } from '@/db/repositories/quotes'
import type { Book, BookLink, BookNote, Character, Quote, Reading } from '@/db/types'
import { formatAuthors } from '@/lib/authors'
import { ACQUISITION_LABELS, BOOK_FORMAT_LABELS, COLOR_LABEL_NAMES } from '@/lib/bookMeta'
import { formatDayShort } from '@/lib/dates'
import { daysRead } from '@/lib/days'
import { pluralRu } from '@/lib/format'
import { formatRating } from '@/lib/rating'
import { DIARY_SECTION_LABELS, sectionsFor, type DiarySection } from '@/lib/templates'

const ALL_SECTIONS = Object.keys(DIARY_SECTION_LABELS) as DiarySection[]

const NOT_FOUND_DELAY_MS = 1000

function ratingSummary(book: Book): string | undefined {
  if (book.rating === undefined && !book.emotion) return undefined
  return formatRating(book.rating, book.ratingScale, book.emotion)
}

function dateRange(book: Book): string | undefined {
  if (book.startedAt && book.finishedAt) {
    return `${formatDayShort(book.startedAt)} — ${formatDayShort(book.finishedAt)}`
  }
  if (book.startedAt) return `с ${formatDayShort(book.startedAt)}`
  if (book.finishedAt) return `до ${formatDayShort(book.finishedAt)}`
  return undefined
}

function dayCount(days: number): string {
  return `${days} ${pluralRu(days, ['день', 'дня', 'дней'])}`
}

export function DiaryScreen() {
  const { bookId } = useParams<{ bookId: string }>()
  const book = useBook(bookId)
  const quotes = useLiveQuery(() => (bookId ? listQuotesByBook(bookId) : []), [bookId])
  const characters = useCharacters(bookId)
  const plotNotes = useBookNotes(bookId, 'plot')
  const insightNotes = useBookNotes(bookId, 'insight')
  const links = useBookLinks(bookId)
  const books = useBooks()
  const readings = useReadings(bookId)
  const [active, setActive] = useState<DiarySection>('overview')
  const [allOpen, setAllOpen] = useState(false)
  const [waitedId, setWaitedId] = useState<string | undefined>(undefined)

  useEffect(() => {
    const timer = setTimeout(() => setWaitedId(bookId), NOT_FOUND_DELAY_MS)
    return () => clearTimeout(timer)
  }, [bookId])

  const waited = waitedId !== undefined && waitedId === bookId

  if (!book) {
    return (
      <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
        <ScreenHeader title="Дневник" caption="Книга" back />
        {waited ? (
          <div className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-4">
            <p className="font-display text-[18px] leading-[24px] font-medium">Книга не найдена</p>
            <p className="mt-1 text-[14px] leading-[20px] text-muted">
              Возможно, она удалена из библиотеки.
            </p>
            <Button to="/shelves" variant="outline" className="mt-4">
              К полкам
            </Button>
          </div>
        ) : (
          <div className="mt-6 space-y-2" aria-hidden>
            <div className="h-28 animate-pulse rounded-[var(--radius-card)] bg-line/50" />
            <div className="h-11 w-2/3 animate-pulse rounded-[var(--radius-control)] bg-line/50" />
            <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-line/50" />
          </div>
        )}
      </div>
    )
  }

  const visible = sectionsFor(book.diaryTemplate)
  const hidden = ALL_SECTIONS.filter((section) => !visible.includes(section))
  const current = active
  const counts: Record<DiarySection, number> = {
    overview: 0,
    quotes: quotes?.length ?? 0,
    characters: characters?.length ?? 0,
    plot: plotNotes?.length ?? 0,
    insights: insightNotes?.length ?? 0,
    links: links?.length ?? 0,
  }
  const rating = ratingSummary(book)
  const range = dateRange(book)
  const days = daysRead(book.startedAt, book.finishedAt)
  const allNotes = [...(plotNotes ?? []), ...(insightNotes ?? [])]

  return (
    <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
      <ScreenHeader
        title={book.title}
        caption="Дневник книги"
        back
        action={
          <Link
            to={`/books/${book.id}/edit`}
            aria-label="Редактировать книгу"
            className="flex size-11 items-center justify-center rounded-full text-muted active:bg-accent-soft"
          >
            <PencilSimple size={20} aria-hidden />
          </Link>
        }
      />

      <div className="mt-5 flex gap-4">
        <BookCover book={book} className="w-24 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <StatusChip status={book.status} />
            {book.colorLabel !== 'none' ? <ColorLabelDot label={book.colorLabel} /> : null}
          </div>
          <p className="mt-1.5 text-[14px] leading-[20px] text-muted">
            {formatAuthors(book.authors)}
          </p>
          {rating ? (
            <p className="mt-1 flex items-center gap-1.5 text-[13px] leading-[18px] text-muted">
              <Star size={14} weight="fill" className="text-accent" aria-hidden />
              {rating}
            </p>
          ) : null}
          {range || days ? (
            <p className="mt-1 text-[13px] leading-[18px] text-muted">
              {[range, days ? dayCount(days) : undefined].filter(Boolean).join(' · ')}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <TemplatePicker
          value={book.diaryTemplate}
          onChange={(diaryTemplate) => {
            setActive('overview')
            void updateBook(book.id, { diaryTemplate })
          }}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {visible.map((section) => {
          const selected = section === current

          return (
            <button
              key={section}
              type="button"
              aria-pressed={selected}
              onClick={() => setActive(section)}
              className={[
                'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-[var(--radius-pill)] px-4 text-[13px] leading-[18px] font-medium',
                selected ? 'bg-accent text-accent-ink' : 'border border-line bg-surface text-muted',
              ].join(' ')}
            >
              {DIARY_SECTION_LABELS[section]}
              {counts[section] > 0 ? (
                <span className={selected ? 'text-[12px] text-accent-ink/80' : 'text-[12px]'}>
                  {counts[section]}
                </span>
              ) : null}
            </button>
          )
        })}
        {hidden.length > 0 ? (
          <button
            type="button"
            onClick={() => setAllOpen(true)}
            className="inline-flex h-11 shrink-0 items-center rounded-[var(--radius-pill)] border border-line bg-surface px-4 text-[13px] leading-[18px] font-medium text-accent"
          >
            Все разделы
          </button>
        ) : null}
      </div>

      <div className="mt-5 border-t border-line pt-5">
        {current === 'overview' ? (
          <Overview
            book={book}
            readings={readings}
            quotes={quotes ?? []}
            characters={characters ?? []}
            notes={allNotes}
            links={links ?? []}
          />
        ) : null}
        {current === 'quotes' ? <QuoteList book={book} /> : null}
        {current === 'characters' ? (
          characters === undefined ? (
            <SectionSkeleton />
          ) : (
            <CharacterList bookId={book.id} characters={characters} />
          )
        ) : null}
        {current === 'plot' ? (
          plotNotes === undefined ? (
            <SectionSkeleton />
          ) : (
            <PlotNoteList bookId={book.id} notes={plotNotes} />
          )
        ) : null}
        {current === 'insights' ? (
          insightNotes === undefined ? (
            <SectionSkeleton />
          ) : (
            <InsightList bookId={book.id} notes={insightNotes} />
          )
        ) : null}
        {current === 'links' ? (
          links === undefined ? (
            <SectionSkeleton />
          ) : (
            <BookLinkList bookId={book.id} links={links} books={books ?? []} />
          )
        ) : null}
      </div>

      <Sheet open={allOpen} onClose={() => setAllOpen(false)} title="Все разделы">
        <div className="flex flex-col">
          {ALL_SECTIONS.map((section) => {
            const selected = section === current
            const count = counts[section]

            return (
              <button
                key={section}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setActive(section)
                  setAllOpen(false)
                }}
                className={[
                  'flex min-h-12 items-center justify-between gap-3 rounded-[var(--radius-control)] px-2 text-left text-[16px] leading-[22px]',
                  selected ? 'bg-accent-soft' : 'active:bg-accent-soft',
                ].join(' ')}
              >
                <span className={visible.includes(section) ? 'text-ink' : 'text-muted'}>
                  {DIARY_SECTION_LABELS[section]}
                </span>
                <span className="shrink-0 text-[13px] leading-[18px] text-muted tabular-nums">
                  {count > 0 ? count : ''}
                </span>
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-[13px] leading-[18px] text-muted">
          Разделы вне шаблона не удалены — записи остаются на месте.
        </p>
      </Sheet>
    </div>
  )
}

function SectionSkeleton() {
  return (
    <div className="space-y-2" aria-hidden>
      <div className="h-6 w-1/3 animate-pulse rounded bg-line/60" />
      <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-line/50" />
    </div>
  )
}

type OverviewProps = {
  book: Book
  readings?: Reading[]
  quotes: Quote[]
  characters: Character[]
  notes: BookNote[]
  links: BookLink[]
}

function Overview({ book, readings, quotes, characters, notes, links }: OverviewProps) {
  const days = daysRead(book.startedAt, book.finishedAt)
  const finished = readings?.filter((reading) => reading.status === 'finished').length ?? 0
  const last = readings && readings.length > 0 ? readings[readings.length - 1] : undefined
  const hasMeta =
    book.tags.length > 0 ||
    book.moods.length > 0 ||
    Boolean(book.format) ||
    Boolean(book.acquisition) ||
    book.colorLabel !== 'none'

  return (
    <div className="flex flex-col gap-5">
      <RatingInput
        rating={book.rating}
        scale={book.ratingScale}
        emotion={book.emotion}
        onChange={(patch) => void updateBook(book.id, patch)}
      />

      <section className="border-t border-line pt-4">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Метаданные
        </h3>

        {book.tags.length > 0 ? <ChipRow label="Теги" values={book.tags} /> : null}
        {book.moods.length > 0 ? <ChipRow label="Настроения" values={book.moods} /> : null}
        {hasMeta && (book.format || book.acquisition || book.colorLabel !== 'none') ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] leading-[18px] text-muted">
            {book.format ? <span>{BOOK_FORMAT_LABELS[book.format]}</span> : null}
            {book.acquisition ? <span>{ACQUISITION_LABELS[book.acquisition]}</span> : null}
            {book.colorLabel !== 'none' ? (
              <span className="inline-flex items-center gap-1.5">
                <ColorLabelDot label={book.colorLabel} />
                {COLOR_LABEL_NAMES[book.colorLabel]}
              </span>
            ) : null}
          </div>
        ) : null}
        {!hasMeta ? (
          <p className="mt-2 text-[13px] leading-[18px] text-muted">
            Теги, настроение и формат можно добавить в карточке книги.{' '}
            <Link to={`/books/${book.id}/edit`} className="text-accent">
              Заполнить
            </Link>
          </p>
        ) : null}
      </section>

      <section className="border-t border-line pt-4">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Чтение</h3>
        <p className="mt-2 text-[15px] leading-[22px]">
          {days ? `${dayCount(days)} с книгой` : 'Ещё не начата'}
        </p>
        <p className="mt-1 text-[13px] leading-[18px] text-muted">
          {readings === undefined
            ? 'Загрузка…'
            : readings.length === 0
              ? 'Попыток чтения пока нет.'
              : [
                  `Попыток: ${readings.length}`,
                  finished > 0 ? `дочитано ${finished}` : undefined,
                  last?.finishedAt ? `последняя ${formatDayShort(last.finishedAt)}` : undefined,
                ]
                  .filter(Boolean)
                  .join(' · ')}
        </p>
      </section>

      <div className="border-t border-line pt-1">
        <DiaryExport
          book={book}
          quotes={quotes}
          characters={characters}
          notes={notes}
          links={links}
        />
      </div>
    </div>
  )
}

type ChipRowProps = {
  label: string
  values: string[]
}

function ChipRow({ label, values }: ChipRowProps) {
  return (
    <div className="mt-2">
      <p className="text-[13px] leading-[18px] text-muted">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {values.map((value) => (
          <span
            key={value}
            className="inline-flex min-h-7 items-center rounded-[var(--radius-pill)] border border-line px-2.5 text-[13px] leading-[18px] text-muted"
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  )
}
