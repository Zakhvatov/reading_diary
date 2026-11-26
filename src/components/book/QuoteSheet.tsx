import { Camera } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { QuoteOcr } from '@/components/export/QuoteOcr'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { createQuote } from '@/db/repositories/quotes'
import type { Book } from '@/db/types'

type QuoteSheetProps = {
  book: Book
  onClose: () => void
}

const fieldClass =
  'mt-1 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 text-[16px] leading-[24px] text-ink placeholder:text-muted/70'

export function QuoteSheet({ book, onClose }: QuoteSheetProps) {
  const [text, setText] = useState('')
  const [page, setPage] = useState('')
  const [chapter, setChapter] = useState('')
  const [note, setNote] = useState('')
  const [favorite, setFavorite] = useState(false)
  const [shareable, setShareable] = useState(false)
  const [ocrOpen, setOcrOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = text.trim()
    if (!trimmed) {
      setError('Введите текст цитаты')
      return
    }

    const pageValue = page.trim() ? Number(page) : undefined
    if (pageValue !== undefined && (!Number.isInteger(pageValue) || pageValue <= 0)) {
      setError('Страница — целое число больше нуля')
      return
    }

    setBusy(true)
    setError(null)

    try {
      await createQuote({
        bookId: book.id,
        text: trimmed,
        page: pageValue,
        chapter: chapter.trim() || undefined,
        note: note.trim() || undefined,
        favorite,
        shareable,
      })
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось сохранить цитату')
      setBusy(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title="Новая цитата">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="max-h-[calc(100dvh-180px)] overflow-y-auto overscroll-contain pb-1"
      >
        <p className="text-[13px] leading-[18px] text-muted">{book.title}</p>

        <label className="mt-4 block">
          <span className="text-[13px] leading-[18px] font-medium text-muted">Текст</span>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={4}
            disabled={busy}
            placeholder="Строки, которые хочется сохранить"
            className={`${fieldClass} min-h-28 resize-y py-3`}
          />
        </label>

        <button
          type="button"
          onClick={() => setOcrOpen((value) => !value)}
          aria-expanded={ocrOpen}
          disabled={busy}
          className="mt-1 flex min-h-11 items-center gap-1.5 text-[13px] leading-[18px] font-medium text-accent"
        >
          <Camera size={16} aria-hidden />
          {ocrOpen ? 'Скрыть распознавание' : 'Распознать с фото'}
        </button>

        {ocrOpen ? (
          <div className="mt-1">
            <QuoteOcr initialText={text} onText={setText} />
          </div>
        ) : null}

        <label className="mt-4 block">
          <span className="text-[13px] leading-[18px] font-medium text-muted">Страница</span>
          <input
            value={page}
            onChange={(event) => setPage(event.target.value)}
            inputMode="numeric"
            disabled={busy}
            placeholder="42"
            className={`${fieldClass} h-12`}
          />
        </label>

        <label className="mt-4 block">
          <span className="text-[13px] leading-[18px] font-medium text-muted">Глава</span>
          <input
            value={chapter}
            onChange={(event) => setChapter(event.target.value)}
            disabled={busy}
            placeholder="Глава 7"
            className={`${fieldClass} h-12`}
          />
        </label>

        <label className="mt-4 flex min-h-11 items-center justify-between gap-3">
          <span className="text-[15px] leading-[20px]">В избранное</span>
          <input
            type="checkbox"
            checked={favorite}
            onChange={(event) => setFavorite(event.target.checked)}
            disabled={busy}
            className="size-5 accent-accent"
          />
        </label>

        <label className="mt-4 flex min-h-11 items-start justify-between gap-3">
          <span>
            <span className="block text-[15px] leading-[20px]">Можно показывать другим</span>
            <span className="block text-[13px] leading-[18px] text-muted">
              Попадёт в карточку и экспорт «Для других».
            </span>
          </span>
          <input
            type="checkbox"
            checked={shareable}
            onChange={(event) => setShareable(event.target.checked)}
            disabled={busy}
            className="mt-1 size-5 shrink-0 accent-accent"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-[13px] leading-[18px] font-medium text-muted">Заметка</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            disabled={busy}
            placeholder="Почему это важно"
            className={`${fieldClass} resize-y py-3`}
          />
        </label>

        {error ? (
          <p role="alert" className="mt-4 text-[14px] leading-[20px] text-signal">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={busy} className="mt-5 w-full">
          {busy ? 'Сохраняем…' : 'Сохранить цитату'}
        </Button>
        <Button variant="ghost" onClick={onClose} className="mt-2 w-full">
          Отмена
        </Button>
      </form>
    </Sheet>
  )
}
