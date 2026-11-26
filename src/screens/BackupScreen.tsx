import { useState, type ChangeEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { exportBackupJson, exportBackupZip } from '@/db/backup/export'
import { importBackup, type ImportSummary } from '@/db/backup/import'
import { toDay } from '@/lib/dates'
import { downloadBlob } from '@/lib/download'

type Status = { tone: 'success' | 'error'; text: string } | null

const recordLabels: Record<string, string> = {
  books: 'книги',
  sessions: 'сессии',
  quotes: 'цитаты',
  journals: 'записи',
  goals: 'цели',
  tombstones: 'удаления',
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

export function BackupScreen() {
  const [busy, setBusy] = useState(false)
  const [replace, setReplace] = useState(false)
  const [status, setStatus] = useState<Status>(null)

  async function handleExport(kind: 'zip' | 'json') {
    setBusy(true)
    setStatus(null)

    try {
      const blob = kind === 'zip' ? await exportBackupZip() : await exportBackupJson()
      const extension = kind === 'zip' ? 'zip' : 'json'
      downloadBlob(blob, `reading-diary-${toDay(new Date())}.${extension}`)
      setStatus({ tone: 'success', text: 'Копия сохранена в загрузки.' })
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

    try {
      const summary = await importBackup(file, replace ? 'replace' : 'merge')
      setStatus({ tone: 'success', text: summaryText(summary) })
    } catch (error) {
      setStatus({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Не удалось прочитать файл.',
      })
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
          Импорт объединяет данные по идентификаторам и дате обновления. Перед заменой данных лучше
          скачать копию.
        </p>

        <label className="mt-4 flex cursor-pointer items-start gap-3 text-[14px] leading-[20px]">
          <input
            type="checkbox"
            checked={replace}
            onChange={(event) => setReplace(event.target.checked)}
            className="mt-0.5 size-5 accent-[var(--accent)]"
          />
          <span>
            Заменить все данные
            <span className="mt-0.5 block text-[13px] leading-[18px] text-muted">
              Текущие книги и записи будут удалены.
            </span>
          </span>
        </label>

        <label className="mt-5 inline-flex h-[52px] w-full cursor-pointer items-center justify-center rounded-[var(--radius-pill)] border border-line bg-surface px-6 text-[16px] font-medium active:scale-[0.98]">
          {busy ? 'Работаем…' : 'Выбрать файл'}
          <input
            type="file"
            accept=".zip,.json,application/zip,application/json"
            className="sr-only"
            disabled={busy}
            onChange={handleFile}
          />
        </label>
      </section>

      {status ? (
        <p
          role="status"
          className={[
            'mt-4 rounded-[var(--radius-control)] px-4 py-3 text-[14px] leading-[20px]',
            status.tone === 'error' ? 'bg-signal-soft text-signal' : 'bg-accent-soft text-ink',
          ].join(' ')}
        >
          {status.text}
        </p>
      ) : null}
    </div>
  )
}
