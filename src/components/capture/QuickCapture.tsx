import { Check } from '@phosphor-icons/react'
import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { useBooks } from '@/db/live'
import { updateBook } from '@/db/repositories/books'
import { createJournal } from '@/db/repositories/journals'
import { createQuote } from '@/db/repositories/quotes'
import type { Book } from '@/db/types'
import { today } from '@/lib/dates'
import { CaptureBookPicker } from './CaptureBookPicker'
import { closeQuickCapture, openQuickCapture, useQuickCaptureOpen } from './quickCaptureStore'

type CaptureKind = 'thought' | 'quote' | 'page'

const KINDS: { id: CaptureKind; label: string; dot: string }[] = [
  { id: 'thought', label: 'Мысль', dot: 'bg-accent' },
  { id: 'quote', label: 'Цитата', dot: 'bg-sky-ink' },
  { id: 'page', label: 'Страница', dot: 'bg-butter-ink' },
]

const textareaClass =
  'mt-1 w-full resize-none rounded-[var(--radius-control)] border border-line bg-surface px-3 py-3 text-[16px] leading-[24px] text-ink placeholder:text-muted/70'
const inputClass =
  'mt-1 h-12 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 text-[16px] text-ink tabular-nums placeholder:text-muted/70'

function titleFromBody(body: string): string {
  return body.split('\n')[0]?.trim().slice(0, 80).trim() || 'Мысль'
}

function BookLine({ book }: { book: Book }) {
  if (!book.pageCount) {
    return (
      <p className="mt-1 text-[12px] leading-[16px] text-muted">
        Сейчас отмечено {book.currentPage} стр.
      </p>
    )
  }

  return <p className="mt-1 text-[12px] leading-[16px] text-muted">В книге {book.pageCount} стр.</p>
}

type QuickCapturePanelProps = {
  onSaved: () => void
}

function QuickCapturePanel({ onSaved }: QuickCapturePanelProps) {
  const books = useBooks()
  const reading = books?.find((book) => book.status === 'reading')
  const defaultBook = reading ?? books?.[0]

  const [kind, setKind] = useState<CaptureKind>('thought')
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [thought, setThought] = useState('')
  const [quote, setQuote] = useState('')
  const [quotePage, setQuotePage] = useState('')
  const [page, setPage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const book = books?.find((item) => item.id === pickedId) ?? defaultBook
  const pageNumber = page.trim() === '' ? null : Number(page)

  function changeKind(next: CaptureKind) {
    setKind(next)
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    setError(null)

    if (kind === 'thought') {
      const body = thought.trim()
      if (!body) return

      setBusy(true)
      try {
        await createJournal({
          title: titleFromBody(body),
          body,
          color: 'pine',
          entryDate: today(),
          bookId: book?.id,
        })
        onSaved()
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Не удалось сохранить мысль')
        setBusy(false)
      }
      return
    }

    if (!book) {
      setError('Сначала добавьте книгу')
      return
    }

    if (kind === 'quote') {
      const text = quote.trim()
      if (!text) return

      const parsedPage = quotePage.trim() === '' ? undefined : Number(quotePage)
      if (parsedPage !== undefined && (!Number.isInteger(parsedPage) || parsedPage <= 0)) {
        setError('Страница — целое число больше нуля')
        return
      }

      setBusy(true)
      try {
        await createQuote({ bookId: book.id, text, page: parsedPage })
        onSaved()
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Не удалось сохранить цитату')
        setBusy(false)
      }
      return
    }

    if (pageNumber === null) return
    if (!Number.isInteger(pageNumber) || pageNumber <= 0) {
      setError('Страница — целое число больше нуля')
      return
    }

    const currentPage = book.pageCount ? Math.min(pageNumber, book.pageCount) : pageNumber
    const patch: Partial<Book> = { currentPage, progressMode: 'pages' }
    if (book.status === 'want') {
      patch.status = 'reading'
      patch.startedAt = book.startedAt ?? today()
    }

    setBusy(true)
    try {
      await updateBook(book.id, patch)
      onSaved()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось сохранить страницу')
      setBusy(false)
    }
  }

  const canSave =
    kind === 'thought'
      ? thought.trim().length > 0
      : kind === 'quote'
        ? Boolean(book) && quote.trim().length > 0
        : Boolean(book) && pageNumber !== null

  return (
    <Sheet open onClose={closeQuickCapture} title="Быстрая запись">
      <form onSubmit={handleSubmit} noValidate>
        <div className="max-h-[calc(85dvh-200px)] overflow-y-auto pr-1">
          <div
            role="group"
            aria-label="Что записать"
            className="flex rounded-[var(--radius-pill)] bg-accent-soft p-1"
          >
            {KINDS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={kind === item.id}
                onClick={() => changeKind(item.id)}
                className={[
                  'flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-pill)] px-1 text-[12px] leading-[15px] font-medium',
                  kind === item.id ? 'bg-surface text-ink' : 'text-muted',
                ].join(' ')}
              >
                <span className={`size-1.5 shrink-0 rounded-full ${item.dot}`} aria-hidden />
                {item.label}
              </button>
            ))}
          </div>

          {books === undefined ? (
            <p className="mt-4 text-[13px] leading-[18px] text-muted">Загружаем книги…</p>
          ) : book ? (
            <div className="mt-4">
              <CaptureBookPicker books={books} book={book} onSelect={setPickedId} />
            </div>
          ) : (
            <p className="mt-4 text-[13px] leading-[18px] text-muted">
              Библиотека пуста. Мысль сохранится без книги, а цитата и страница — после того, как
              добавите книгу.
            </p>
          )}

          {kind === 'thought' ? (
            <label className="mt-4 block">
              <span className="text-[13px] leading-[18px] font-medium text-muted">Мысль</span>
              <textarea
                value={thought}
                onChange={(event) => {
                  setThought(event.target.value)
                  setError(null)
                }}
                rows={4}
                autoFocus
                disabled={busy}
                placeholder="О чём подумалось во время чтения"
                className={textareaClass}
              />
            </label>
          ) : null}

          {kind === 'quote' ? (
            <>
              <label className="mt-4 block">
                <span className="text-[13px] leading-[18px] font-medium text-muted">Текст</span>
                <textarea
                  value={quote}
                  onChange={(event) => {
                    setQuote(event.target.value)
                    setError(null)
                  }}
                  rows={4}
                  autoFocus
                  disabled={busy}
                  placeholder="Строки, которые хочется сохранить"
                  className={textareaClass}
                />
              </label>

              <label className="mt-4 block">
                <span className="text-[13px] leading-[18px] font-medium text-muted">
                  Страница, необязательно
                </span>
                <input
                  value={quotePage}
                  onChange={(event) => {
                    setQuotePage(event.target.value)
                    setError(null)
                  }}
                  inputMode="numeric"
                  disabled={busy}
                  placeholder="42"
                  className={inputClass}
                />
              </label>
            </>
          ) : null}

          {kind === 'page' ? (
            <label className="mt-4 block">
              <span className="text-[13px] leading-[18px] font-medium text-muted">
                На какой странице
              </span>
              <input
                value={page}
                onChange={(event) => {
                  setPage(event.target.value)
                  setError(null)
                }}
                inputMode="numeric"
                autoFocus
                disabled={busy}
                placeholder={book ? String(book.currentPage) : ''}
                className={inputClass}
              />
              {book ? <BookLine book={book} /> : null}
              {book?.pageCount && pageNumber !== null && pageNumber > book.pageCount ? (
                <span className="mt-1 block text-[12px] leading-[16px] text-muted">
                  Запишем {book.pageCount} — последнюю страницу.
                </span>
              ) : null}
            </label>
          ) : null}

          {error ? (
            <p role="alert" className="mt-4 text-[13px] leading-[18px] text-signal">
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <Button type="submit" disabled={busy || !canSave}>
            {busy ? 'Сохраняем…' : 'Сохранить'}
          </Button>
          <Button variant="outline" onClick={closeQuickCapture} disabled={busy}>
            Отмена
          </Button>
        </div>
      </form>
    </Sheet>
  )
}

export function QuickCapture() {
  const open = useQuickCaptureOpen()
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!saved) return
    const timeout = setTimeout(() => setSaved(false), 1800)
    return () => clearTimeout(timeout)
  }, [saved])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
      if (event.code !== 'KeyN' && event.key.toLowerCase() !== 'n') return

      const target = event.target
      if (target instanceof HTMLElement) {
        if (target.isContentEditable) return
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      }

      if (document.querySelector('[aria-modal="true"]')) return

      event.preventDefault()
      openQuickCapture()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <>
      {open ? (
        <QuickCapturePanel
          onSaved={() => {
            closeQuickCapture()
            setSaved(true)
          }}
        />
      ) : null}

      {saved && !open ? (
        <p
          role="status"
          className="fixed left-1/2 z-40 flex -translate-x-1/2 items-center gap-1.5 rounded-[var(--radius-pill)] bg-accent-soft px-4 py-2 text-[14px] leading-[20px] font-medium text-accent"
          style={{ bottom: 'calc(var(--tab-h) + var(--safe-bottom) + 16px)' }}
        >
          <Check size={16} aria-hidden />
          Записано
        </p>
      ) : null}
    </>
  )
}
