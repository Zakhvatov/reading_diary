import { CaretLeft } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

type ScreenHeaderProps = {
  title: string
  caption?: string
  back?: boolean
  action?: ReactNode
  captionClassName?: string
  hero?: boolean
}

export function ScreenHeader({
  title,
  caption,
  back = false,
  action,
  captionClassName,
  hero = false,
}: ScreenHeaderProps) {
  const navigate = useNavigate()

  return (
    <header
      className={['screen-head flex items-start justify-between gap-4', hero ? 'hero-head' : ''].join(' ')}
    >
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
            <p
              data-custom={captionClassName ? 'true' : undefined}
              className={[
                'text-[10px] font-semibold uppercase tracking-[0.14em]',
                captionClassName ?? 'text-muted/80',
                hero ? 'hero-caption' : '',
              ].join(' ')}
            >
              {caption}
            </p>
          ) : null}
          <h1
            className={[
              'mt-1 font-display text-[30px] leading-[36px] font-medium tracking-[-0.02em] text-ink',
              hero ? 'hero-title' : '',
            ].join(' ')}
          >
            {title}
          </h1>
        </div>
      </div>
      {action ? <div className="shrink-0 pt-1">{action}</div> : null}
    </header>
  )
}
