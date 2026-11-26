import { useEffect, useState } from 'react'
import { importBackup } from '@/db/backup/import'
import { formatDay } from '@/lib/dates'
import { formatBytes, pluralRu } from '@/lib/format'
import {
  isSnapshotSupported,
  listSnapshots,
  maybeCreateSnapshot,
  restoreSnapshot,
  type SnapshotInfo,
} from '@/lib/snapshot'

type LoadState = 'loading' | 'ready' | 'empty' | 'unsupported' | 'error'

type Status = { tone: 'success' | 'error'; text: string } | null

export function SnapshotList() {
  const [state, setState] = useState<LoadState>('loading')
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([])
  const [busyName, setBusyName] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!isSnapshotSupported()) {
        if (!cancelled) setState('unsupported')
        return
      }

      try {
        await maybeCreateSnapshot()
        const items = await listSnapshots()

        if (cancelled) return
        setSnapshots(items)
        setState(items.length > 0 ? 'ready' : 'empty')
      } catch {
        if (!cancelled) setState('error')
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleRestore(snapshot: SnapshotInfo) {
    setBusyName(snapshot.name)
    setStatus(null)

    try {
      const file = await restoreSnapshot(snapshot.name)
      const summary = await importBackup(file, 'merge')
      const changed = [...Object.values(summary.added), ...Object.values(summary.updated)].reduce(
        (total, count) => total + count,
        0,
      )

      setStatus({
        tone: 'success',
        text:
          changed > 0
            ? `Объединено со снимком: ${changed} ${pluralRu(changed, ['запись', 'записи', 'записей'])}.`
            : 'Снимок совпадает с текущими данными.',
      })
    } catch (error) {
      const quota = error instanceof Error && error.name === 'QuotaExceededError'
      setStatus({
        tone: 'error',
        text: quota
          ? 'Мало места в браузере. Скачайте копию файлом и освободите место.'
          : error instanceof Error
            ? error.message
            : 'Не удалось восстановить снимок.',
      })
    } finally {
      setBusyName(null)
    }
  }

  return (
    <section className="mt-4 rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <h2 className="font-display text-[20px] leading-[26px] font-medium">Снимки</h2>
      <p className="mt-2 text-[14px] leading-[20px] text-muted">
        Локальные копии раз в сутки, последние семь. Они лежат в хранилище браузера и исчезнут при
        очистке данных — файл в Files или iCloud надёжнее.
      </p>

      {state === 'loading' ? (
        <div className="mt-4 space-y-2" aria-hidden>
          <div className="h-12 animate-pulse rounded-[var(--radius-control)] bg-line/50" />
          <div className="h-12 animate-pulse rounded-[var(--radius-control)] bg-line/50" />
        </div>
      ) : null}

      {state === 'unsupported' ? (
        <p className="mt-4 text-[14px] leading-[20px] text-muted">
          Браузер не поддерживает локальные снимки. Скачайте копию файлом.
        </p>
      ) : null}

      {state === 'empty' ? (
        <p className="mt-4 text-[14px] leading-[20px] text-muted">
          Снимков пока нет — первый появится при следующем открытии этого экрана.
        </p>
      ) : null}

      {state === 'error' ? (
        <p className="mt-4 text-[14px] leading-[20px] text-muted">
          Не удалось прочитать снимки. Скачайте копию файлом.
        </p>
      ) : null}

      {state === 'ready' ? (
        <ul className="mt-3 divide-y divide-line">
          {snapshots.map((snapshot) => (
            <li
              key={snapshot.name}
              className="flex min-h-[56px] items-center justify-between gap-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-[14px] leading-[20px]">{formatDay(snapshot.date)}</p>
                <p className="text-[12px] leading-[16px] text-muted tabular-nums">
                  {formatBytes(snapshot.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRestore(snapshot)}
                disabled={busyName !== null}
                className="min-h-11 shrink-0 rounded-[var(--radius-pill)] border border-line px-4 text-[14px] font-medium active:bg-accent-soft disabled:opacity-50"
              >
                {busyName === snapshot.name ? 'Восстанавливаем…' : 'Восстановить'}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {status ? (
        <p
          role="status"
          className={[
            'mt-3 rounded-[var(--radius-control)] px-4 py-3 text-[13px] leading-[18px]',
            status.tone === 'error' ? 'bg-signal-soft text-signal' : 'bg-accent-soft text-ink',
          ].join(' ')}
        >
          {status.text}
        </p>
      ) : null}
    </section>
  )
}
