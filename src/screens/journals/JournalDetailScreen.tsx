import { BookOpen, PencilSimple } from '@phosphor-icons/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { JOURNAL_COLOR_STYLES } from '@/components/journal/colors'
import { JournalPhoto } from '@/components/journal/JournalPhoto'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { Sheet } from '@/components/ui/Sheet'
import { useBook } from '@/db/live'
import { deleteJournal, getJournal } from '@/db/repositories/journals'
import { formatDay } from '@/lib/dates'
import { renderMarkdown } from '@/lib/markdown'

export function JournalDetailScreen() {
  const { journalId } = useParams()
  const entry = useLiveQuery(async () => {
    if (!journalId) return null
    return (await getJournal(journalId)) ?? null
  }, [journalId])
  const book = useBook(entry?.bookId)
  const navigate = useNavigate()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (entry === undefined) {
    return (
      <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
        <ScreenHeader title="Запись" caption="Дневник" back />
        <p className="mt-6 text-muted">Загрузка…</p>
      </div>
    )
  }

  if (entry === null) {
    return (
      <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
        <ScreenHeader title="Запись" caption="Дневник" back />
        <p className="mt-6 text-muted">Запись не найдена.</p>
        <Button variant="outline" to="/journals" className="mt-4">
          К записям
        </Button>
      </div>
    )
  }

  const tone = JOURNAL_COLOR_STYLES[entry.color]

  async function remove() {
    if (!entry) return

    setBusy(true)
    setError(null)

    try {
      await deleteJournal(entry.id)
      navigate('/journals', { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось удалить запись')
      setBusy(false)
    }
  }

  return (
    <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
      <ScreenHeader title="Запись" caption="Дневник" back />

      {entry.photoId ? (
        <JournalPhoto
          photoId={entry.photoId}
          alt={`Фото к записи «${entry.title || 'Без названия'}»`}
          className="mt-5 h-48 w-full rounded-[var(--radius-card)] object-cover"
        />
      ) : null}

      <article
        className={`relative mt-5 overflow-hidden rounded-[var(--radius-card)] p-5 pl-6 ${tone.surface} ${tone.ink}`}
      >
        <span aria-hidden className={`absolute inset-y-0 left-0 w-1.5 ${tone.stripe}`} />
        <time
          dateTime={entry.entryDate}
          className="block text-[11px] leading-[14px] font-medium tracking-[0.08em] uppercase opacity-70"
        >
          {formatDay(entry.entryDate)}
        </time>
        <h2 className="mt-1 font-display text-[26px] leading-[32px] font-medium">
          {entry.title || 'Без названия'}
        </h2>
        {book ? (
          <Link
            to={`/books/${book.id}`}
            className="mt-2 inline-flex max-w-full items-center gap-1.5 text-[13px] leading-[18px] underline underline-offset-2 opacity-80"
          >
            <BookOpen size={15} aria-hidden className="shrink-0" />
            <span className="truncate">{book.title}</span>
          </Link>
        ) : null}
      </article>

      {entry.body.trim() ? <div className="mt-6">{renderMarkdown(entry.body)}</div> : null}

      {error ? (
        <p role="alert" className="mt-4 text-[14px] leading-[20px] text-signal">
          {error}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6">
        <Button variant="outline" to={`/journals/${entry.id}/edit`}>
          <PencilSimple size={18} aria-hidden />
          Редактировать
        </Button>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="min-h-11 text-[14px] leading-[20px] text-signal"
        >
          Удалить запись
        </button>
      </div>

      <Sheet open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Удалить запись?">
        <p className="text-[15px] leading-[23px] text-muted">
          Запись и её фото удалятся без возможности отменить.
        </p>
        <div className="mt-5 flex flex-col gap-3">
          <Button variant="danger" onClick={remove} disabled={busy}>
            {busy ? 'Удаляем…' : 'Удалить'}
          </Button>
          <Button variant="outline" onClick={() => setDeleteOpen(false)}>
            Отмена
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
