import { useSyncExternalStore } from 'react'

let open = false
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function openQuickCapture(): void {
  if (open) return
  open = true
  emit()
}

export function closeQuickCapture(): void {
  if (!open) return
  open = false
  emit()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useQuickCaptureOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => open,
    () => false,
  )
}
