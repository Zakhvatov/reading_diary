import type { ReactNode } from 'react'

type SectionHeaderProps = {
  title: string
  count?: number
  action?: ReactNode
}

export function SectionHeader({ title, count, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-display text-[22px] leading-[28px] font-medium text-ink">
        {title}
        {count !== undefined && count > 0 ? (
          <span className="ml-2 text-[13px] leading-[18px] font-normal text-muted">{count}</span>
        ) : null}
      </h2>
      {action}
    </div>
  )
}

type DiaryEmptyProps = {
  icon: ReactNode
  title: string
  description: string
  actionLabel: string
  onAction: () => void
}

export function DiaryEmpty({ icon, title, description, actionLabel, onAction }: DiaryEmptyProps) {
  return (
    <div className="mt-3 rounded-[var(--radius-card)] border border-line bg-surface p-4">
      <span className="inline-flex text-accent" aria-hidden>
        {icon}
      </span>
      <p className="mt-2 font-display text-[18px] leading-[24px] font-medium">{title}</p>
      <p className="mt-1 text-[14px] leading-[20px] text-muted">{description}</p>
      <button
        type="button"
        onClick={onAction}
        className="mt-3 inline-flex min-h-11 items-center rounded-[var(--radius-pill)] border border-line px-4 text-[14px] font-medium active:bg-accent-soft"
      >
        {actionLabel}
      </button>
    </div>
  )
}
