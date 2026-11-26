import { useEffect, useState } from 'react'

/**
 * Появляется, когда service worker уже обновился в фоне.
 * Первую установку не показываем: страница ещё не была под контролем SW.
 */
export function UpdatePrompt() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    if (!navigator.serviceWorker.controller) return

    const onControllerChange = () => setReady(true)
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  if (!ready) return null

  return (
    <div
      role="status"
      className="fixed inset-x-4 z-40 mx-auto flex max-w-md items-center justify-between gap-3 rounded-[var(--radius-control)] bg-butter px-4 py-3 text-butter-ink"
      style={{ bottom: 'calc(var(--tab-h) + var(--safe-bottom) + 12px)' }}
    >
      <span className="text-[13px] leading-[18px]">Доступна новая версия</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="h-9 shrink-0 rounded-[var(--radius-pill)] bg-ink px-3 text-[13px] font-medium text-paper"
      >
        Обновить
      </button>
    </div>
  )
}
