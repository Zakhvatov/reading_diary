import type { ReactNode } from 'react'

const toneClasses = {
  sage: 'bg-sage text-sage-ink',
  butter: 'bg-butter text-butter-ink',
  sky: 'bg-sky text-sky-ink',
  peach: 'bg-peach text-peach-ink',
  lilac: 'bg-lilac text-lilac-ink',
  rose: 'bg-rose text-rose-ink',
} as const

type EmptyStateProps = {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  tone?: keyof typeof toneClasses
}

export function EmptyState({ icon, title, description, action, tone = 'sage' }: EmptyStateProps) {
  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
      <div
        className={`inline-flex size-14 items-center justify-center rounded-[var(--radius-control)] ${toneClasses[tone]}`}
        aria-hidden
      >
        {icon}
      </div>
      <h2 className="mt-5 font-display text-[26px] leading-[32px] font-medium text-ink">{title}</h2>
      {description ? (
        <p className="mt-2 text-[14px] leading-[21px] text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </section>
  )
}
