import { ArrowRight, Notebook } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { JournalCard } from '@/components/journal/JournalCard'
import type { JournalEntry } from '@/db/types'
import { Skeleton } from './Skeleton'

type JournalPreviewProps = {
  entry: JournalEntry | undefined
  loading: boolean
}

export function JournalPreview({ entry, loading }: JournalPreviewProps) {
  return (
    <section className="mt-6" aria-labelledby="home-journal">
      <div className="flex items-center justify-between gap-3">
        <h2 id="home-journal" className="font-display text-[20px] leading-[26px] font-medium">
          Дневник
        </h2>
        <Link
          to="/journals"
          className="inline-flex min-h-11 items-center text-[14px] leading-[20px] font-medium text-accent"
        >
          Все
        </Link>
      </div>

      <div className="mt-2">
        {loading ? (
          <Skeleton className="h-32" />
        ) : entry ? (
          <JournalCard entry={entry} />
        ) : (
          <Link
            to="/journals/new"
            className="flex min-h-[76px] items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface px-4 py-3 active:bg-accent-soft"
          >
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-sage text-sage-ink"
            >
              <Notebook size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] leading-[21px] font-medium text-ink">
                Записать мысль
              </span>
              <span className="block text-[13px] leading-[18px] text-muted">
                О книге, герое или дне чтения
              </span>
            </span>
            <ArrowRight size={18} aria-hidden className="shrink-0 text-muted" />
          </Link>
        )}
      </div>
    </section>
  )
}
