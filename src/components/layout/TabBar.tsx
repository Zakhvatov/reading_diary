import { ChartBar, Notebook, Books, Sun } from '@phosphor-icons/react'
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
  { to: '/journals', label: 'Дневник', icon: Notebook },
  { to: '/stats', label: 'Статистика', icon: ChartBar },
]

export function TabBar() {
  return (
    <nav
      aria-label="Разделы"
      className="tab-bar fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[var(--safe-bottom)]"
    >
      <ul className="mx-auto flex h-[var(--tab-h)] max-w-xl items-stretch">
        {tabs.map(({ to, label, icon: TabIcon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className="relative flex h-full min-h-11 flex-col items-center justify-center gap-1"
            >
              {({ isActive }) => (
                <>
                  <span
                    className={[
                      'flex size-8 items-center justify-center rounded-full transition-colors duration-[160ms]',
                      isActive ? 'bg-accent-soft text-accent' : 'text-muted',
                    ].join(' ')}
                  >
                    <TabIcon size={22} weight={isActive ? 'fill' : 'regular'} aria-hidden />
                  </span>
                  <span
                    className={[
                      'text-[11px] leading-none transition-colors duration-[160ms]',
                      isActive ? 'font-medium text-accent' : 'text-muted',
                    ].join(' ')}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
