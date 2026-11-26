import { ChartBar, Notebook, Books, Sun, Timer } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { NavLink } from 'react-router-dom'

type Tab = {
  to: string
  label: string
  icon: Icon
}

const tabs: Tab[] = [
  { to: '/home', label: 'Сегодня', icon: Sun },
  { to: '/shelves', label: 'Библиотека', icon: Books },
  { to: '/timer', label: 'Таймер', icon: Timer },
  { to: '/journals', label: 'Дневник', icon: Notebook },
  { to: '/stats', label: 'Статистика', icon: ChartBar },
]

export function TabBar() {
  return (
    <nav
      aria-label="Разделы"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[var(--safe-bottom)]"
    >
      <ul className="mx-auto flex h-[var(--tab-h)] max-w-xl items-stretch">
        {tabs.map(({ to, label, icon: TabIcon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className={({ isActive }) =>
                [
                  'relative flex h-full min-h-11 flex-col items-center justify-center gap-1 text-[11px] leading-none',
                  isActive ? 'text-accent' : 'text-muted',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-accent" />
                  ) : null}
                  <TabIcon size={22} weight={isActive ? 'fill' : 'regular'} aria-hidden />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
