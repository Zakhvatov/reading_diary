import { GearSix } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { formatHomeDate, greetingFor } from './greeting'

export function HomeHeader() {
  const now = new Date()

  return (
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-[32px] leading-[38px] font-medium text-ink">
          {greetingFor(now)}
        </h1>
        <p className="mt-1 text-[14px] leading-[20px] text-muted">{formatHomeDate(now)}</p>
      </div>
      <Link
        to="/settings"
        aria-label="Настройки"
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted active:bg-accent-soft"
      >
        <GearSix size={22} aria-hidden />
      </Link>
    </header>
  )
}
