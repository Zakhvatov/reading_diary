import type { BookStatus } from '@/db/types'
import { STATUS_LABELS } from '@/lib/bookStatus'
import { STATUS_TONE } from './statusTone'

type StatusChipProps = {
  status: BookStatus
  size?: 'md' | 'sm'
  className?: string
}

export function StatusChip({ status, size = 'md', className }: StatusChipProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-[var(--radius-pill)] font-medium leading-none',
        size === 'sm' ? 'h-5 px-2 text-[10px]' : 'h-7 px-3 text-[12px]',
        STATUS_TONE[status].chip,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
