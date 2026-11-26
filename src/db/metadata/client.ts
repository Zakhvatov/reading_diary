const TIMEOUT_MS = 8_000
const MAX_ATTEMPTS = 3
const BACKOFF_MS = [1_000, 2_000]

export type MetadataErrorCode = 'offline' | 'timeout' | 'http'

const MESSAGES: Record<MetadataErrorCode, string> = {
  offline: 'Нет подключения к интернету. Проверьте сеть и попробуйте ещё раз.',
  timeout: 'Сервис книг не ответил вовремя. Попробуйте ещё раз.',
  http: 'Сервис книг временно недоступен. Попробуйте позже.',
}

export class MetadataError extends Error {
  readonly code: MetadataErrorCode

  constructor(code: MetadataErrorCode) {
    super(MESSAGES[code])
    this.name = 'MetadataError'
    this.code = code
  }
}

type AttemptResult =
  { ok: true; data: unknown } | { ok: false; retryable: boolean; error: MetadataError }

function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException('Aborted', 'AbortError')
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw abortReason(signal)
  }
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  if (!signal) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  const activeSignal = signal

  return new Promise((resolve, reject) => {
    if (activeSignal.aborted) {
      reject(abortReason(activeSignal))
      return
    }

    const timer = setTimeout(() => {
      activeSignal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    function onAbort(): void {
      clearTimeout(timer)
      reject(abortReason(activeSignal))
    }

    activeSignal.addEventListener('abort', onAbort, { once: true })
  })
}

async function attemptFetch(url: string, signal?: AbortSignal): Promise<AttemptResult> {
  const controller = new AbortController()
  let timedOut = false

  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, TIMEOUT_MS)

  const onAbort = (): void => controller.abort()
  signal?.addEventListener('abort', onAbort)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500
      return { ok: false, retryable, error: new MetadataError('http') }
    }

    const data: unknown = await response.json()
    return { ok: true, data }
  } catch (error) {
    if (signal?.aborted) {
      throw abortReason(signal)
    }
    if (timedOut) {
      return { ok: false, retryable: false, error: new MetadataError('timeout') }
    }
    if (error instanceof TypeError) {
      return { ok: false, retryable: true, error: new MetadataError('offline') }
    }
    return { ok: false, retryable: false, error: new MetadataError('http') }
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

export async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  let lastError = new MetadataError('http')

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    throwIfAborted(signal)

    const result = await attemptFetch(url, signal)
    if (result.ok) {
      return result.data
    }

    lastError = result.error
    if (!result.retryable || attempt === MAX_ATTEMPTS - 1) {
      break
    }

    await delay(BACKOFF_MS[attempt] ?? 0, signal)
  }

  throw lastError
}
