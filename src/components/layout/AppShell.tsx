import { Outlet, useLocation } from 'react-router-dom'
import { Fab } from './Fab'
import { TabBar } from './TabBar'

const fullscreenRoutes = new Set(['/scan'])

export function AppShell() {
  const { pathname } = useLocation()
  const fullscreen = fullscreenRoutes.has(pathname)

  return (
    <div className="min-h-[100dvh]">
      <main
        className={
          fullscreen
            ? 'pb-[calc(var(--safe-bottom)+24px)]'
            : 'pb-[calc(var(--tab-h)+var(--safe-bottom)+24px)]'
        }
      >
        <Outlet />
      </main>
      <Fab />
      {fullscreen ? null : <TabBar />}
    </div>
  )
}
