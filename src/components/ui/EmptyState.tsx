import type { ReactNode } from 'react'

type EmptyStateProps = {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
      <div className="text-accent" aria-hidden>
        {icon}
      </div>
      <h2 className="mt-4 font-display text-[22px] leading-[28px] font-medium text-ink">{title}</h2>
      {description ? <p className="mt-2 text-muted">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </section>
  )
}
