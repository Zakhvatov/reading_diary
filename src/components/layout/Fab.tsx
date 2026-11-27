import { Plus } from '@phosphor-icons/react'
import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { openQuickCapture } from '@/components/capture/quickCaptureStore'
import { useSettings } from '@/db/live'
import { DEFAULT_THEME } from '@/lib/theme'

const fabRoutes = new Set(['/home', '/shelves'])

const LONG_PRESS_MS = 500
const MOVE_TOLERANCE_PX = 10

export function Fab() {
  const { pathname } = useLocation()
  const settings = useSettings()
  const theme = settings?.theme ?? DEFAULT_THEME
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressed = useRef(false)
  const origin = useRef<{ x: number; y: number } | null>(null)

  function clearTimer() {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }

  function cancel() {
    clearTimer()
    origin.current = null
  }

  useEffect(() => clearTimer, [])

  if (!fabRoutes.has(pathname)) {
    return null
  }

  // На главной лаванды добавление живёт в «Библиотеке»: кнопка не должна
  // висеть над лентой обложек.
  if (theme === 'lavender' && pathname === '/home') {
    return null
  }

  return (
    <Link
      to="/add"
      aria-label="Добавить книгу, долгое нажатие — быстрая запись"
      onPointerDown={(event) => {
        if (event.button !== 0) return

        longPressed.current = false
        origin.current = { x: event.clientX, y: event.clientY }
        clearTimer()
        timer.current = setTimeout(() => {
          timer.current = null
          longPressed.current = true
          openQuickCapture()
        }, LONG_PRESS_MS)
      }}
      onPointerMove={(event) => {
        const start = origin.current
        if (!start) return

        if (
          Math.abs(event.clientX - start.x) > MOVE_TOLERANCE_PX ||
          Math.abs(event.clientY - start.y) > MOVE_TOLERANCE_PX
        ) {
          cancel()
        }
      }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onClick={(event) => {
        if (!longPressed.current) return
        event.preventDefault()
        longPressed.current = false
      }}
      onContextMenu={(event) => event.preventDefault()}
      className="fixed right-5 z-40 flex size-14 touch-manipulation items-center justify-center rounded-full bg-accent text-accent-ink shadow-none transition-transform duration-150 select-none active:scale-[0.96]"
      style={{
        bottom: 'calc(var(--tab-h) + var(--safe-bottom) + 16px + var(--fab-extra, 0px))',
        WebkitTouchCallout: 'none',
      }}
    >
      <Plus size={24} weight="bold" aria-hidden />
    </Link>
  )
}
