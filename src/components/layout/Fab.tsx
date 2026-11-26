import { Plus } from '@phosphor-icons/react'
import { Link, useLocation } from 'react-router-dom'

const fabRoutes = new Set(['/home', '/shelves'])

export function Fab() {
  const { pathname } = useLocation()

  if (!fabRoutes.has(pathname)) {
    return null
  }

  return (
    <Link
      to="/add"
      aria-label="Добавить книгу"
      className="fixed right-5 z-40 flex size-14 items-center justify-center rounded-full bg-accent text-accent-ink shadow-none transition-transform duration-150 active:scale-[0.96]"
      style={{ bottom: 'calc(var(--tab-h) + var(--safe-bottom) + 16px)' }}
    >
      <Plus size={24} weight="bold" aria-hidden />
    </Link>
  )
}
