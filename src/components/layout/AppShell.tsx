import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { QuickCapture } from '@/components/capture/QuickCapture'
import { maybeCreateSnapshot } from '@/lib/snapshot'
import { Fab } from './Fab'
import { TabBar } from './TabBar'
import { UpdatePrompt } from './UpdatePrompt'

const fullscreenRoutes = new Set(['/scan'])
const boardRoute = /^\/journals\/[^/]+\/board\/?$/

export function AppShell() {
  const { pathname } = useLocation()
  const fullscreen = fullscreenRoutes.has(pathname) || boardRoute.test(pathname)

  useEffect(() => {
    void maybeCreateSnapshot()
  }, [])

  return (
    <div className="min-h-[100dvh]">
      <main
        className={
          fullscreen
            ? 'pb-[calc(var(--safe-bottom)+24px)]'
            : 'pb-[calc(var(--tab-h)+var(--safe-bottom)+24px+var(--shell-extra,0px))]'
        }
      >
        <Outlet />
      </main>
      <Fab />
      <QuickCapture />
      <UpdatePrompt />
      {fullscreen ? null : <TabBar />}
    </div>
  )
}
