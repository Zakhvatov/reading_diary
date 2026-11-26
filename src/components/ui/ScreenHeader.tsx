import { CaretLeft } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

type ScreenHeaderProps = {
  title: string
  caption?: string
  back?: boolean
  action?: ReactNode
}

export function ScreenHeader({ title, caption, back = false, action }: ScreenHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-1">
        {back ? (
          <button
            type="button"
            aria-label="Назад"
            onClick={() => navigate(-1)}
            className="-ml-3 flex size-11 shrink-0 items-center justify-center rounded-full text-ink active:bg-accent-soft"
          >
            <CaretLeft size={22} aria-hidden />
          </button>
        ) : null}
        <div className="min-w-0">
          {caption ? (
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              {caption}
            </p>
          ) : null}
          <h1 className="mt-1 font-display text-[32px] leading-[38px] font-medium text-ink">
            {title}
          </h1>
        </div>
      </div>
      {action ? <div className="shrink-0 pt-1">{action}</div> : null}
    </header>
  )
}
