import { useEffect, useState } from 'react'

const VERSION_KEY = 'rd.appVersion'

function readPreviousVersion(): string | null {
  try {
    return localStorage.getItem(VERSION_KEY)
  } catch {
    return null
  }
}

export function UpdateToast() {
  const [previousVersion] = useState(readPreviousVersion)
  const [visible, setVisible] = useState(
    previousVersion !== null && previousVersion !== __APP_VERSION__,
  )

  useEffect(() => {
    try {
      localStorage.setItem(VERSION_KEY, __APP_VERSION__)
    } catch {
      // Storage can be unavailable in private mode; the toast is optional.
    }

    if (!visible) {
      return
    }

    const timer = window.setTimeout(() => setVisible(false), 4000)

    return () => window.clearTimeout(timer)
  }, [visible])

  if (!visible) {
    return null
  }

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[calc(var(--tab-h)+var(--safe-bottom)+16px)] z-50 mx-auto max-w-sm rounded-[var(--radius-control)] bg-ink px-4 py-3 text-center text-[14px] leading-5 text-paper"
    >
      Приложение обновлено
    </div>
  )
}
