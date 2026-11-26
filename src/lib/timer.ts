export const TIMER_STORAGE_KEY = 'rd.timer.v1'

/** Сессия длиннее 12 часов не сохраняется автоматически. */
export const MAX_SESSION_MS = 12 * 60 * 60 * 1000

export type TimerState = {
  bookId: string
  startedAt: string
  accumulatedMs: number
  runningSince?: number
}

export type StoppedTimer = {
  bookId: string
  startedAt: string
  durationMs: number
  needsTrim: boolean
}

export function startTimer(bookId: string, now: number = Date.now()): TimerState {
  return {
    bookId,
    startedAt: new Date(now).toISOString(),
    accumulatedMs: 0,
    runningSince: now,
  }
}

export function elapsedMs(state: TimerState, now: number = Date.now()): number {
  if (state.runningSince === undefined) {
    return state.accumulatedMs
  }

  return state.accumulatedMs + Math.max(0, now - state.runningSince)
}

export function pauseTimer(state: TimerState, now: number = Date.now()): TimerState {
  if (state.runningSince === undefined) {
    return state
  }

  return {
    bookId: state.bookId,
    startedAt: state.startedAt,
    accumulatedMs: elapsedMs(state, now),
  }
}

export function resumeTimer(state: TimerState, now: number = Date.now()): TimerState {
  if (state.runningSince !== undefined) {
    return state
  }

  return { ...state, runningSince: now }
}

export function stopTimer(state: TimerState, now: number = Date.now()): StoppedTimer {
  const durationMs = elapsedMs(state, now)

  return {
    bookId: state.bookId,
    startedAt: state.startedAt,
    durationMs,
    needsTrim: needsTrim(durationMs),
  }
}

export function needsTrim(durationMs: number): boolean {
  return durationMs > MAX_SESSION_MS
}

export function serializeTimer(state: TimerState): string {
  const payload: TimerState = {
    bookId: state.bookId,
    startedAt: state.startedAt,
    accumulatedMs: state.accumulatedMs,
  }

  if (state.runningSince !== undefined) {
    payload.runningSince = state.runningSince
  }

  return JSON.stringify(payload)
}

export function parseTimer(raw: string | null | undefined): TimerState | null {
  if (!raw) return null

  let value: unknown

  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }

  if (!isRecord(value)) return null

  const { bookId, startedAt, accumulatedMs, runningSince } = value

  if (typeof bookId !== 'string' || bookId.trim() === '') return null
  if (typeof startedAt !== 'string' || !isIsoDateTime(startedAt)) return null
  if (typeof accumulatedMs !== 'number' || !Number.isFinite(accumulatedMs) || accumulatedMs < 0) {
    return null
  }
  if (
    runningSince !== undefined &&
    (typeof runningSince !== 'number' || !Number.isFinite(runningSince) || runningSince <= 0)
  ) {
    return null
  }

  const state: TimerState = { bookId, startedAt, accumulatedMs }

  if (runningSince !== undefined) {
    state.runningSince = runningSince
  }

  return state
}

/** Крупные цифры таймера: ЧЧ:ММ:СС. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isIsoDateTime(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) && !Number.isNaN(Date.parse(value))
}
