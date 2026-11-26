import type { BookStatus } from '@/db/types'
import { STATUS_LABELS } from '@/lib/bookStatus'

const toneClasses: Record<BookStatus, string> = {
  reading: 'bg-accent text-accent-ink',
  want: 'bg-butter text-butter-ink',
  finished: 'bg-sky text-sky-ink',
  dnf: 'bg-rose text-rose-ink',
}

type StatusChipProps = {
  status: BookStatus
  className?: string
}

export function StatusChip({ status, className }: StatusChipProps) {
  return (
    <span
      className={[
        'inline-flex h-7 items-center rounded-[var(--radius-pill)] px-3 text-[12px] font-medium leading-none',
        toneClasses[status],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
