import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { normalizeIsbn } from '@/lib/isbn'
import {
  createIsbnDetector,
  requestScreenWakeLock,
  stopStream,
  type IsbnDetector,
  type WakeLockHandle,
} from '@/lib/scanner'

const POLL_INTERVAL_MS = 250
const DUPLICATE_WINDOW_MS = 1500

const inputClass =
  'mt-1 h-12 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 text-[16px] text-ink placeholder:text-muted/70'

function cameraErrorMessage(caught: unknown): string {
  if (caught instanceof DOMException) {
    if (caught.name === 'NotAllowedError') {
      return 'Нет доступа к камере. Разрешите её в настройках браузера.'
    }
    if (caught.name === 'NotFoundError') {
      return 'Камера не найдена.'
    }
  }

  return 'Не удалось включить камеру.'
}

function playBeep(): void {
  try {
    const context = new AudioContext()

    if (context.state === 'suspended') {
      void context.resume()
    }

    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gain.gain.value = 0.06
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.08)
    oscillator.onended = () => void context.close()
  } catch {
    // Звук необязателен: книга всё равно откроется.
  }
}

export function ScanScreen() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const lastScanRef = useRef<{ value: string; at: number } | null>(null)
  const mountedRef = useRef(true)
  const [starting, setStarting] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isbn, setIsbn] = useState('')
  const [isbnError, setIsbnError] = useState(false)

  const stopCamera = useCallback(() => {
    stopStream(streamRef.current)
    streamRef.current = null

    const video = videoRef.current
    if (video) {
      video.srcObject = null
    }

    setScanning(false)
  }, [])

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      stopStream(streamRef.current)
      streamRef.current = null
    }
  }, [])

  async function startCamera() {
    if (starting) return

    setCameraError(null)
    setStarting(true)

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Камера недоступна в этом браузере.')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      if (!mountedRef.current) {
        stopStream(stream)
        return
      }

      const video = videoRef.current
      if (!video) {
        stopStream(stream)
        setCameraError('Не удалось включить камеру.')
        return
      }

      streamRef.current = stream
      video.srcObject = stream
      await video.play().catch(() => undefined)
      lastScanRef.current = null
      setScanning(true)
    } catch (caught) {
      stopStream(streamRef.current)
      streamRef.current = null
      if (mountedRef.current) {
        setCameraError(cameraErrorMessage(caught))
      }
    } finally {
      if (mountedRef.current) {
        setStarting(false)
      }
    }
  }

  useEffect(() => {
    if (!scanning) return

    let cancelled = false
    let timer: number | undefined
    let detector: IsbnDetector | null = null

    async function tick() {
      if (cancelled) return

      const video = videoRef.current
      if (!video) return

      if (!detector) {
        try {
          detector = await createIsbnDetector()
        } catch {
          if (!cancelled) {
            setCameraError('Не удалось запустить распознавание штрихкода.')
            stopCamera()
          }
          return
        }

        if (cancelled) return
      }

      if (video.readyState >= 2 && video.videoWidth > 0) {
        try {
          const codes = await detector.detect(video)
          if (cancelled) return

          for (const code of codes) {
            const normalized = normalizeIsbn(code.rawValue)
            if (!normalized?.isbn13) continue

            const now = Date.now()
            const last = lastScanRef.current
            if (last?.value === normalized.isbn13 && now - last.at < DUPLICATE_WINDOW_MS) {
              continue
            }

            lastScanRef.current = { value: normalized.isbn13, at: now }
            playBeep()
            stopCamera()
            navigate(`/add?tab=search&isbn=${normalized.isbn13}`, { replace: true })
            return
          }
        } catch {
          // Кадр не распознался — продолжаем поиск.
        }
      }

      if (!cancelled) {
        timer = window.setTimeout(tick, POLL_INTERVAL_MS)
      }
    }

    void tick()

    return () => {
      cancelled = true
      if (timer !== undefined) {
        window.clearTimeout(timer)
      }
    }
  }, [scanning, navigate, stopCamera])

  useEffect(() => {
    if (!scanning) return

    let active = true
    let sentinel: WakeLockHandle | null = null

    void requestScreenWakeLock().then((lock) => {
      if (!lock) return

      if (!active) {
        void lock.release().catch(() => undefined)
        return
      }

      sentinel = lock
    })

    return () => {
      active = false
      void sentinel?.release().catch(() => undefined)
    }
  }, [scanning])

  function openIsbn(isbn13: string) {
    stopCamera()
    navigate(`/add?tab=search&isbn=${isbn13}`, { replace: true })
  }

  function submitManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalized = normalizeIsbn(isbn)
    if (!normalized?.isbn13) {
      setIsbnError(true)
      return
    }

    setIsbnError(false)
    openIsbn(normalized.isbn13)
  }

  return (
    <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
      <ScreenHeader title="Сканер ISBN" caption="Новая книга" back />

      <div className="relative mt-6 aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] bg-ink">
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          aria-label="Видеопоток с камеры"
          className="size-full object-cover"
        />

        {!scanning && !starting ? (
          <div className="absolute inset-0 flex items-center justify-center px-8 text-center">
            <p className="text-[14px] leading-[20px] text-accent-ink/70">Камера выключена</p>
          </div>
        ) : null}

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-[10%] top-1/2 h-[38%] -translate-y-1/2"
        >
          <span className="absolute top-0 left-0 size-6 rounded-tl-[6px] border-t-2 border-l-2 border-accent" />
          <span className="absolute top-0 right-0 size-6 rounded-tr-[6px] border-t-2 border-r-2 border-accent" />
          <span className="absolute bottom-0 left-0 size-6 rounded-bl-[6px] border-b-2 border-l-2 border-accent" />
          <span className="absolute right-0 bottom-0 size-6 rounded-br-[6px] border-r-2 border-b-2 border-accent" />
          {scanning ? (
            <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 animate-pulse bg-accent" />
          ) : null}
        </div>
      </div>

      <p className="mt-3 text-center text-[13px] leading-[18px] text-muted">
        Наведите на штрихкод на обороте книги
      </p>

      {starting || scanning ? (
        <p className="mt-2 text-center text-[13px] leading-[18px] text-accent" role="status">
          {starting ? 'Включаем камеру…' : 'Ищем штрихкод…'}
        </p>
      ) : null}

      {cameraError ? (
        <p
          role="alert"
          className="mt-4 rounded-[var(--radius-card)] border border-signal/40 bg-signal-soft p-4 text-[14px] leading-[20px]"
        >
          {cameraError}
        </p>
      ) : null}

      <div className="mt-4">
        {scanning ? (
          <Button variant="outline" onClick={stopCamera} className="w-full">
            Остановить камеру
          </Button>
        ) : (
          <Button onClick={startCamera} disabled={starting} className="w-full">
            {starting ? 'Включаем камеру…' : 'Включить камеру'}
          </Button>
        )}
      </div>

      <section className="mt-10 border-t border-line pt-6">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Или вручную
        </h2>

        <form onSubmit={submitManual} noValidate className="mt-3">
          <label className="block">
            <span className="text-[13px] leading-[18px] font-medium text-muted">ISBN</span>
            <input
              name="isbn"
              value={isbn}
              onChange={(event) => {
                setIsbn(event.target.value)
                setIsbnError(false)
              }}
              inputMode="numeric"
              autoComplete="off"
              placeholder="978-5-17-090258-3"
              className={inputClass}
            />
          </label>

          {isbnError ? (
            <p role="alert" className="mt-1 text-[13px] leading-[18px] text-signal">
              Проверьте ISBN
            </p>
          ) : null}

          <Button type="submit" variant="outline" className="mt-4 w-full">
            Найти книгу
          </Button>
        </form>
      </section>
    </div>
  )
}
