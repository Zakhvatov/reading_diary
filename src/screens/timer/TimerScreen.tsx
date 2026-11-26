import { Books, Pause, Play } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { BookCover } from '@/components/book/BookCover'
import { SessionSheet } from '@/components/session/SessionSheet'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { useBooks } from '@/db/live'
import { requestScreenWakeLock, type WakeLockHandle } from '@/lib/scanner'
import {
  TIMER_STORAGE_KEY,
  elapsedMs,
  formatClock,
  parseTimer,
  pauseTimer,
  resumeTimer,
  serializeTimer,
  startTimer,
  type TimerState,
} from '@/lib/timer'

function loadStoredTimer(): TimerState | null {
  try {
    return parseTimer(localStorage.getItem(TIMER_STORAGE_KEY))
  } catch {
    return null
  }
}

function storeTimer(state: TimerState | null): void {
  try {
    if (state) {
      localStorage.setItem(TIMER_STORAGE_KEY, serializeTimer(state))
    } else {
      localStorage.removeItem(TIMER_STORAGE_KEY)
    }
  } catch {
    // Storage can be unavailable in private mode; the timer still works in memory.
  }
}

const barButton =
  'h-10 rounded-[var(--radius-pill)] px-3 text-[13px] leading-[18px] font-medium active:opacity-90 disabled:opacity-50'

export function TimerScreen() {
  const { bookId: routeBookId } = useParams()
  const [searchParams] = useSearchParams()
  const books = useBooks()
  const [initialTimer] = useState(loadStoredTimer)
  const [timer, setTimer] = useState<TimerState | null>(initialTimer)
  const [selectedBookId, setSelectedBookId] = useState(
    routeBookId ?? searchParams.get('book') ?? '',
  )
  const [recoveryVisible, setRecoveryVisible] = useState(initialTimer?.runningSince !== undefined)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [wakeLockFailed, setWakeLockFailed] = useState(false)
  const [, setTick] = useState(0)

  const runningSince = timer?.runningSince
  const running = runningSince !== undefined
  const activeBookId = timer?.bookId ?? selectedBookId
  const book = books?.find((item) => item.id === activeBookId)

  useEffect(() => {
    if (runningSince === undefined) return

    const update = () => setTick((tick) => tick + 1)
    const interval = window.setInterval(update, 1000)

    document.addEventListener('visibilitychange', update)
    window.addEventListener('focus', update)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', update)
      window.removeEventListener('focus', update)
    }
  }, [runningSince])

  useEffect(() => {
    if (!running) return

    let cancelled = false
    let handle: WakeLockHandle | null = null

    function release(current: WakeLockHandle | null) {
      if (!current) return
      void current.release().catch(() => undefined)
    }

    async function acquire() {
      release(handle)
      handle = null
      const next = await requestScreenWakeLock()

      if (cancelled) {
        release(next)
        return
      }

      handle = next
      setWakeLockFailed(next === null)
    }

    void acquire()

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void acquire()
      }
    }

    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      release(handle)
    }
  }, [running])

  function persist(next: TimerState | null) {
    storeTimer(next)
    setTimer(next)
  }

  function begin() {
    if (!selectedBookId) return

    persist(startTimer(selectedBookId))
    setRecoveryVisible(false)
  }

  function togglePause() {
    if (!timer) return

    const wasRunning = timer.runningSince !== undefined
    if (!wasRunning) setWakeLockFailed(false)

    persist(wasRunning ? pauseTimer(timer) : resumeTimer(timer))
  }

  function finish() {
    if (!timer) return

    persist(pauseTimer(timer))
    setRecoveryVisible(false)
    setSheetOpen(true)
  }

  function cancel() {
    persist(null)
    setRecoveryVisible(false)
    setSheetOpen(false)
  }

  return (
    <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
      <ScreenHeader title="Таймер" caption="Чтение" />

      {recoveryVisible && timer ? (
        <section className="mt-5 rounded-[var(--radius-card)] border border-line bg-surface px-4 py-4">
          <p className="text-[15px] leading-[22px] font-medium">Таймер всё ещё идёт</p>
          <p className="mt-1 text-[13px] leading-[18px] text-muted">
            {book ? book.title : 'Книга не найдена'} · {formatClock(elapsedMs(timer))}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setRecoveryVisible(false)}
              className={`${barButton} bg-accent text-accent-ink`}
            >
              Продолжить
            </button>
            <button
              type="button"
              onClick={finish}
              disabled={!book}
              className={`${barButton} border border-line text-ink`}
            >
              Завершить
            </button>
            <button
              type="button"
              onClick={cancel}
              className={`${barButton} border border-line text-muted`}
            >
              Отменить
            </button>
          </div>
        </section>
      ) : null}

      {books === undefined ? <p className="mt-6 text-muted">Загрузка…</p> : null}

      {books !== undefined && timer ? (
        book ? (
          <div className="mt-8">
            <div className="flex flex-col items-center text-center">
              <BookCover book={book} className="w-24" />
              <h2 className="mt-4 font-display text-[24px] leading-[30px] font-medium">
                {book.title}
              </h2>
              <p className="mt-1 text-[14px] leading-[20px] text-muted">
                {book.authors.join(', ') || 'Автор не указан'}
              </p>
            </div>

            <p
              className="mt-10 text-center font-display text-[56px] leading-[64px] font-medium tabular-nums"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {formatClock(elapsedMs(timer))}
            </p>
            <p className="mt-1 text-center text-[13px] leading-[18px] text-muted">
              {running ? 'Идёт' : 'Пауза'}
            </p>

            {running && wakeLockFailed ? (
              <p className="mt-3 text-center text-[12px] leading-[16px] text-muted">
                Экран может погаснуть — таймер продолжит идти.
              </p>
            ) : null}

            <div className="mt-8 flex flex-col gap-3">
              <Button onClick={togglePause}>
                {running ? (
                  <>
                    <Pause size={20} aria-hidden />
                    Пауза
                  </>
                ) : (
                  <>
                    <Play size={20} aria-hidden />
                    Продолжить
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={finish}>
                Завершить сессию
              </Button>
            </div>

            <button
              type="button"
              onClick={cancel}
              className="mt-6 block w-full text-center text-[14px] leading-[20px] text-muted"
            >
              Отменить таймер
            </button>
          </div>
        ) : (
          <div className="mt-8">
            <p className="text-[15px] leading-[22px] text-muted">Книга не найдена.</p>
            <div className="mt-4">
              <Button variant="outline" onClick={cancel}>
                Отменить таймер
              </Button>
            </div>
          </div>
        )
      ) : null}

      {books !== undefined && !timer && book ? (
        <div className="mt-8">
          <div className="flex flex-col items-center text-center">
            <BookCover book={book} className="w-24" />
            <h2 className="mt-4 font-display text-[24px] leading-[30px] font-medium">
              {book.title}
            </h2>
            <p className="mt-1 text-[14px] leading-[20px] text-muted">
              {book.authors.join(', ') || 'Автор не указан'}
            </p>
          </div>

          <p
            className="mt-10 text-center font-display text-[56px] leading-[64px] font-medium tabular-nums"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            00:00:00
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <Button onClick={begin}>Начать</Button>
            <Button variant="outline" onClick={() => setSelectedBookId('')}>
              Выбрать другую книгу
            </Button>
          </div>
        </div>
      ) : null}

      {books !== undefined && !timer && !book ? (
        <div className="mt-6">
          {books.length === 0 ? (
            <EmptyState
              icon={<Books size={28} />}
              title="Нет книг"
              description="Добавьте книгу, чтобы запустить таймер чтения."
              action={<Button to="/add">Добавить книгу</Button>}
            />
          ) : (
            <>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                Выберите книгу
              </p>
              <ul className="mt-1">
                {books.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedBookId(item.id)}
                      className="flex min-h-[68px] w-full items-center gap-3 border-b border-line/70 py-3 text-left"
                    >
                      <BookCover book={item} className="w-9 shrink-0" />
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] leading-[21px]">
                          {item.title}
                        </span>
                        <span className="mt-0.5 block truncate text-[13px] leading-[18px] text-muted">
                          {item.authors.join(', ') || 'Автор не указан'}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}

      {sheetOpen && timer && book ? (
        <SessionSheet
          book={book}
          title="Завершить сессию"
          initial={{
            mode: 'timer',
            startedAt: timer.startedAt,
            durationMs: elapsedMs(timer),
            startPage: book.currentPage,
          }}
          onClose={() => setSheetOpen(false)}
          onSaved={(session) => {
            persist(null)
            setSelectedBookId(session.bookId)
            setRecoveryVisible(false)
          }}
        />
      ) : null}
    </div>
  )
}
