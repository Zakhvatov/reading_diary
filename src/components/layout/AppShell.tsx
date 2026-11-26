import { Outlet } from 'react-router-dom'
import { Fab } from './Fab'
import { TabBar } from './TabBar'

export function AppShell() {
  return (
    <div className="min-h-[100dvh]">
      <main className="pb-[calc(var(--tab-h)+var(--safe-bottom)+24px)]">
        <Outlet />
      </main>
      <Fab />
      <TabBar />
    </div>
  )
}
