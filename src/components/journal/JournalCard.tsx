import { BookOpen } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { useBook } from '@/db/live'
import type { JournalEntry } from '@/db/types'
import { formatDay } from '@/lib/dates'
import { markdownToPlainText } from '@/lib/markdown'
import { JOURNAL_COLOR_STYLES } from './colors'
import { JournalPhoto } from './JournalPhoto'

type JournalCardProps = {
  entry: JournalEntry
}

export function JournalCard({ entry }: JournalCardProps) {
  const book = useBook(entry.bookId)
  const tone = JOURNAL_COLOR_STYLES[entry.color]
  const preview = markdownToPlainText(entry.body)

  return (
    <Link
      to={`/journals/${entry.id}`}
      className={`relative block overflow-hidden rounded-[var(--radius-card)] p-4 pl-5 ${tone.surface} ${tone.ink}`}
    >
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1.5 ${tone.stripe}`} />
      <span
        aria-hidden
        className="absolute top-0 right-0 size-4 bg-paper [clip-path:polygon(100%_0,100%_100%,0_0)]"
      />

      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <time
            dateTime={entry.entryDate}
            className="block text-[11px] leading-[14px] font-medium tracking-[0.08em] uppercase opacity-70"
          >
            {formatDay(entry.entryDate)}
          </time>
          <h2 className="mt-1 line-clamp-2 font-display text-[20px] leading-[26px] font-medium">
            {entry.title || 'Без названия'}
          </h2>
          {preview ? (
            <p className="mt-1.5 line-clamp-2 text-[14px] leading-[21px] opacity-80">{preview}</p>
          ) : null}
          {book ? (
            <p className="mt-2 flex items-center gap-1.5 text-[12px] leading-[16px] opacity-75">
              <BookOpen size={14} aria-hidden className="shrink-0" />
              <span className="line-clamp-1">{book.title}</span>
            </p>
          ) : null}
        </div>

        {entry.photoId ? (
          <JournalPhoto
            photoId={entry.photoId}
            alt={`Фото к записи «${entry.title || 'Без названия'}»`}
            className="size-16 shrink-0 rounded-[10px] object-cover"
          />
        ) : null}
      </div>
    </Link>
  )
}
