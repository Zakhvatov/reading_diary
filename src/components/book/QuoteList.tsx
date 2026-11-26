import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Copy, Plus, Quotes, Star, Trash } from '@phosphor-icons/react'
import { useEffect, useId, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { QuoteCardSheet } from '@/components/export/QuoteCardSheet'
import { deleteQuote, listQuotesByBook } from '@/db/repositories/quotes'
import type { Book, Quote } from '@/db/types'
import { QuoteSheet } from './QuoteSheet'

type QuoteListProps = {
  book: Book
}

function copyText(book: Book, quote: Quote): string {
  const author = book.authors.length > 0 ? ` — ${book.authors.join(', ')}` : ''
  const page = quote.page ? `, с. ${quote.page}` : ''
  return `${quote.text}\n\n${book.title}${author}${page}`
}

type CopyStatus = { id: string; ok: boolean } | null

export function QuoteList({ book }: QuoteListProps) {
  const quotes = useLiveQuery(() => listQuotesByBook(book.id), [book.id])
  const [adding, setAdding] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Quote | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState<CopyStatus>(null)
  const [cardQuote, setCardQuote] = useState<Quote | null>(null)
  const headingId = useId()

  const ordered = [...(quotes ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  useEffect(() => {
    if (!copyStatus) return
    const timer = setTimeout(() => setCopyStatus(null), 2000)
    return () => clearTimeout(timer)
  }, [copyStatus])

  async function copyQuote(quote: Quote) {
    try {
      await navigator.clipboard.writeText(copyText(book, quote))
      setCopyStatus({ id: quote.id, ok: true })
    } catch {
      setCopyStatus({ id: quote.id, ok: false })
    }
  }

  async function removeQuote() {
    if (!pendingDelete) return

    setDeleting(true)
    setDeleteError(null)

    try {
      await deleteQuote(pendingDelete.id)
      setPendingDelete(null)
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : 'Не удалось удалить цитату')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section aria-labelledby={headingId}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={headingId} className="font-display text-[22px] leading-[28px] font-medium text-ink">
          Цитаты
          {ordered.length > 0 ? (
            <span className="ml-2 text-[13px] leading-[18px] font-normal text-muted">
              {ordered.length}
            </span>
          ) : null}
        </h2>
        {ordered.length > 0 ? (
          <Button variant="outline" onClick={() => setAdding(true)}>
            <Plus size={18} aria-hidden />
            Добавить
          </Button>
        ) : null}
      </div>

      {quotes === undefined ? (
        <div className="mt-3 space-y-2" aria-hidden>
          <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-line/50" />
          <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-line/50" />
        </div>
      ) : ordered.length === 0 ? (
        <div className="mt-3 rounded-[var(--radius-card)] border border-line bg-surface p-4">
          <Quotes size={24} aria-hidden className="text-accent" />
          <p className="mt-3 font-display text-[18px] leading-[24px] font-medium">Пока нет цитат</p>
          <p className="mt-1 text-[14px] leading-[20px] text-muted">
            Сохраните строки, к которым хочется вернуться.
          </p>
          <Button variant="outline" onClick={() => setAdding(true)} className="mt-4">
            Добавить цитату
          </Button>
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {ordered.map((quote) => {
            const status = copyStatus?.id === quote.id ? copyStatus : null

            return (
              <li
                key={quote.id}
                className="rounded-[var(--radius-card)] border border-line bg-surface p-4"
              >
                <blockquote className="font-display text-[17px] leading-[26px] italic whitespace-pre-line">
                  {quote.text}
                </blockquote>
                {quote.note ? (
                  <p className="mt-2 text-[13px] leading-[18px] text-muted">{quote.note}</p>
                ) : null}

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-1.5 text-[13px] leading-[18px] text-muted">
                    {quote.favorite ? (
                      <Star
                        size={14}
                        weight="fill"
                        className="shrink-0 text-accent"
                        aria-label="Избранная цитата"
                      />
                    ) : null}
                    <span className="min-w-0 tabular-nums">
                      {[quote.chapter, quote.page ? `с. ${quote.page}` : '']
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  <div className="flex items-center gap-1">
                    {status ? (
                      <span className="text-[12px] leading-[16px] text-muted">
                        {status.ok ? 'Скопировано' : 'Не удалось'}
                      </span>
                    ) : null}
                    {quote.shareable ? (
                      <button
                        type="button"
                        onClick={() => setCardQuote(quote)}
                        className="min-h-11 shrink-0 rounded-[var(--radius-pill)] border border-line px-3 text-[13px] leading-[18px] font-medium text-accent active:bg-accent-soft"
                      >
                        Карточка
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => copyQuote(quote)}
                      aria-label={
                        status?.ok ? 'Цитата скопирована' : 'Скопировать цитату с автором'
                      }
                      className="flex size-11 items-center justify-center rounded-full text-ink active:bg-accent-soft"
                    >
                      {status?.ok ? (
                        <Check size={18} className="text-accent" aria-hidden />
                      ) : (
                        <Copy size={18} aria-hidden />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null)
                        setPendingDelete(quote)
                      }}
                      aria-label="Удалить цитату"
                      className="flex size-11 items-center justify-center rounded-full text-signal active:bg-signal-soft"
                    >
                      <Trash size={18} aria-hidden />
                    </button>
                  </div>
                </div>
                <p role="status" className="sr-only">
                  {status?.ok
                    ? 'Цитата скопирована'
                    : status && !status.ok
                      ? 'Не удалось скопировать'
                      : ''}
                </p>
              </li>
            )
          })}
        </ul>
      )}

      {adding ? <QuoteSheet book={book} onClose={() => setAdding(false)} /> : null}

      {cardQuote ? (
        <QuoteCardSheet quote={cardQuote} book={book} onClose={() => setCardQuote(null)} />
      ) : null}

      <Sheet
        open={Boolean(pendingDelete)}
        onClose={() => {
          if (!deleting) setPendingDelete(null)
        }}
        title="Удалить цитату?"
      >
        <p className="line-clamp-3 text-[15px] leading-[23px] text-muted">
          {pendingDelete ? `«${pendingDelete.text}»` : ''}
        </p>
        {deleteError ? (
          <p role="alert" className="mt-3 text-[14px] leading-[20px] text-signal">
            {deleteError}
          </p>
        ) : null}
        <div className="mt-5 flex flex-col gap-3">
          <Button variant="danger" onClick={removeQuote} disabled={deleting}>
            {deleting ? 'Удаляем…' : 'Удалить'}
          </Button>
          <Button variant="outline" onClick={() => setPendingDelete(null)} disabled={deleting}>
            Отмена
          </Button>
        </div>
      </Sheet>
    </section>
  )
}
