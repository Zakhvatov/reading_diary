import { useState, type ChangeEvent } from 'react'
import { SnapshotList } from '@/components/settings/SnapshotList'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { exportBackupJson, exportBackupZip } from '@/db/backup/export'
import { importBackup, readBackup, type ImportMode, type ImportSummary } from '@/db/backup/import'
import { useSettings } from '@/db/live'
import { updateSettings } from '@/db/repositories/settings'
import type { BackupManifest } from '@/db/schema'
import { formatMoment, toDay } from '@/lib/dates'
import { downloadBlob } from '@/lib/download'
import { nowISO } from '@/lib/id'

type Status = { tone: 'success' | 'error' | 'muted'; text: string } | null

type Preview = {
  blob: Blob
  name: string
  manifest: BackupManifest
}

const recordLabels: Record<string, string> = {
  books: 'книги',
  readings: 'прочтения',
  sessions: 'сессии',
  quotes: 'цитаты',
  journals: 'записи',
  goals: 'цели',
  tombstones: 'удаления',
  covers: 'обложки',
  settings: 'настройки',
}

function summaryText(summary: ImportSummary): string {
  const added = Object.entries(summary.added)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => `${recordLabels[key] ?? key} +${count}`)
  const updated = Object.entries(summary.updated)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => `${recordLabels[key] ?? key} ~${count}`)

  const parts = [...added, ...updated]
  if (summary.covers > 0) parts.push(`обложки +${summary.covers}`)
  if (summary.skipped > 0) parts.push(`пропущено ${summary.skipped}`)

  return parts.length > 0 ? `Готово: ${parts.join(', ')}.` : 'Готово: новых данных нет.'
}

function countsText(counts: Record<string, number>): string {
  const parts = Object.entries(counts)
    .filter(([key, count]) => count > 0 && key !== 'settings' && key !== 'tombstones')
    .map(([key, count]) => `${recordLabels[key] ?? key}: ${count}`)

  return parts.length > 0 ? parts.join(' · ') : 'нет данных'
}

function importErrorMessage(error: unknown): string {
  if (error instanceof Error && error.name === 'QuotaExceededError') {
    return 'Мало места в браузере. Удалите старые снимки или освободите место.'
  }

  const message = error instanceof Error ? error.message : ''
  if (/quota/i.test(message)) {
    return 'Мало места в браузере. Удалите старые снимки или освободите место.'
  }
  if (message.includes('более новой версии')) {
    return 'Файл из более новой версии приложения. Обновите приложение.'
  }
  if (
    message.includes('повреждён') ||
    message.includes('не является бэкапом') ||
    message.includes('нет manifest.json') ||
    message.includes('нет таблиц') ||
    message.includes('нет данных')
  ) {
    return message
  }

  return 'Не удалось прочитать файл: возможно, архив повреждён.'
}

async function shareOrDownload(
  blob: Blob,
  filename: string,
  title: string,
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], filename, { type: blob.type })
  let shareable = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  if (shareable && typeof navigator.canShare === 'function') {
    try {
      shareable = navigator.canShare({ files: [file] })
    } catch {
      shareable = false
    }
  }

  if (shareable) {
    try {
      await navigator.share({ files: [file], title })
      return 'shared'
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled'
    }
  }

  downloadBlob(blob, filename)
  return 'downloaded'
}

export function BackupScreen() {
  const settings = useSettings()
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<ImportMode>('merge')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [status, setStatus] = useState<Status>(null)

  async function handleExport(kind: 'zip' | 'json') {
    setBusy(true)
    setStatus(null)

    try {
      const blob =
        kind === 'zip'
          ? await exportBackupZip({ markBackup: false })
          : await exportBackupJson({ markBackup: false })
      const filename = `reading-diary-${toDay(new Date())}.${kind}`
      const result = await shareOrDownload(
        blob,
        filename,
        kind === 'zip' ? 'Резервная копия' : 'Данные дневника',
      )

      if (result === 'cancelled') {
        setStatus({ tone: 'muted', text: 'Сохранение отменено.' })
        return
      }

      await updateSettings({ lastBackupAt: nowISO() })
      setStatus({
        tone: 'success',
        text:
          result === 'shared'
            ? 'Копия передана. Проверьте, что файл сохранён в Files.'
            : 'Копия сохранена в загрузки.',
      })
    } catch (error) {
      setStatus({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Не удалось сохранить копию.',
      })
    } finally {
      setBusy(false)
    }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    setBusy(true)
    setStatus(null)
    setPreview(null)

    try {
      const backup = await readBackup(file)
      setPreview({ blob: file, name: file.name, manifest: backup.manifest })
      setMode('merge')
    } catch (error) {
      setStatus({ tone: 'error', text: importErrorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirm() {
    if (!preview) return

    setBusy(true)
    setStatus(null)

    try {
      const summary = await importBackup(preview.blob, mode)
      setStatus({ tone: 'success', text: summaryText(summary) })
      setPreview(null)
    } catch (error) {
      setStatus({ tone: 'error', text: importErrorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
      <ScreenHeader title="Резервная копия" caption="Настройки" back />

      <p className="mt-4 text-muted">
        Один файл со всеми книгами, сессиями и заметками. Сохраните его в Files или на диск.
      </p>
      <p className="mt-2 text-[13px] leading-[18px] text-muted">
        {settings?.lastBackupAt
          ? `Последняя копия: ${formatMoment(settings.lastBackupAt)}`
          : 'Копий ещё не было.'}
      </p>

      <section className="mt-8 rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <h2 className="font-display text-[20px] leading-[26px] font-medium">Скачать</h2>
        <p className="mt-2 text-[14px] leading-[20px] text-muted">
          ZIP с обложками и данными. JSON — только текст, для отладки.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <Button onClick={() => handleExport('zip')} disabled={busy}>
            Скачать копию
          </Button>
          <Button variant="outline" onClick={() => handleExport('json')} disabled={busy}>
            Только данные (JSON)
          </Button>
        </div>
      </section>

      <section className="mt-4 rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <h2 className="font-display text-[20px] leading-[26px] font-medium">Восстановить</h2>
        <p className="mt-2 text-[14px] leading-[20px] text-muted">
          Сначала покажем, что внутри файла. Данные объединяются по идентификаторам и дате
          обновления.
        </p>

        {preview ? (
          <div className="mt-4 rounded-[var(--radius-control)] border border-line bg-paper p-4">
            <p className="text-[14px] leading-[20px] font-medium break-words">{preview.name}</p>
            <p className="mt-1 text-[12px] leading-[16px] text-muted">
              Схема: v{preview.manifest.schemaVersion}
            </p>
            <p className="mt-1 text-[13px] leading-[18px] text-muted">
              {countsText(preview.manifest.counts)}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {(['merge', 'replace'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => setMode(value)}
                  className={[
                    'min-h-11 rounded-[var(--radius-control)] border px-3 text-[14px] font-medium',
                    mode === value
                      ? 'border-accent bg-accent-soft text-ink'
                      : 'border-line bg-surface text-muted',
                  ].join(' ')}
                >
                  {value === 'merge' ? 'Объединить' : 'Заменить'}
                </button>
              ))}
            </div>
            <p
              className={[
                'mt-2 text-[12px] leading-[16px]',
                mode === 'replace' ? 'text-signal' : 'text-muted',
              ].join(' ')}
            >
              {mode === 'merge'
                ? 'Добавит новое и обновит более свежие записи.'
                : 'Удалит текущие данные и оставит только содержимое файла.'}
            </p>

            <div className="mt-4 flex gap-3">
              <Button
                onClick={handleConfirm}
                variant={mode === 'replace' ? 'danger' : 'primary'}
                disabled={busy}
                className="flex-1"
              >
                {busy ? 'Импортируем…' : mode === 'replace' ? 'Заменить данные' : 'Импортировать'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setPreview(null)
                  setStatus(null)
                }}
                disabled={busy}
              >
                Отмена
              </Button>
            </div>
          </div>
        ) : (
          <label className="mt-4 inline-flex h-[52px] w-full cursor-pointer items-center justify-center rounded-[var(--radius-pill)] border border-line bg-surface px-6 text-[16px] font-medium active:scale-[0.98]">
            {busy ? 'Читаем файл…' : 'Выбрать файл'}
            <input
              type="file"
              accept=".zip,.json,application/zip,application/json"
              className="sr-only"
              disabled={busy}
              onChange={handleFile}
            />
          </label>
        )}
      </section>

      <SnapshotList />

      {status ? (
        <p
          role="status"
          className={[
            'mt-4 rounded-[var(--radius-control)] px-4 py-3 text-[14px] leading-[20px]',
            status.tone === 'error'
              ? 'bg-signal-soft text-signal'
              : status.tone === 'muted'
                ? 'border border-line bg-surface text-muted'
                : 'bg-accent-soft text-ink',
          ].join(' ')}
        >
          {status.text}
        </p>
      ) : null}
    </div>
  )
}
