import { DownloadSimple, ShareNetwork } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import type { Book, Quote } from '@/db/types'
import { downloadBlob } from '@/lib/download'
import {
  quoteCardFileName,
  renderQuoteCard,
  shareQuoteCard,
  type QuoteCardTheme,
} from '@/lib/quoteCard'

type QuoteCardSheetProps = {
  quote: Quote
  book: Book
  onClose: () => void
}

type RenderedCard = {
  theme: QuoteCardTheme
  url: string
  blob: Blob
}

const THEMES: { value: QuoteCardTheme; label: string }[] = [
  { value: 'paper', label: 'Бумага' },
  { value: 'ink', label: 'Чернила' },
]

export function QuoteCardSheet({ quote, book, onClose }: QuoteCardSheetProps) {
  const [theme, setTheme] = useState<QuoteCardTheme>('paper')
  const [card, setCard] = useState<RenderedCard | null>(null)
  const [failure, setFailure] = useState<{ theme: QuoteCardTheme; message: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false

    renderQuoteCard(quote, book, { theme })
      .then((blob) => {
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        if (urlRef.current) URL.revokeObjectURL(urlRef.current)
        urlRef.current = url
        setFailure(null)
        setCard({ theme, url, blob })
      })
      .catch((caught: unknown) => {
        if (cancelled) return
        setFailure({
          theme,
          message: caught instanceof Error ? caught.message : 'Не удалось собрать карточку',
        })
      })

    return () => {
      cancelled = true
    }
  }, [quote, book, theme])

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    }
  }, [])

  const fileName = quoteCardFileName(book.title)
  const rendering = !card || card.theme !== theme
  const error = failure?.theme === theme ? failure.message : null

  function chooseTheme(next: QuoteCardTheme) {
    setTheme(next)
    setStatus(null)
  }

  async function share() {
    if (!card) return

    setBusy(true)
    setStatus(null)

    try {
      const outcome = await shareQuoteCard(card.blob, fileName)
      if (outcome === 'downloaded') setStatus('Файл сохранён — поделитесь им из «Файлов»')
      if (outcome === 'cancelled') setStatus('Готово')
    } catch {
      setFailure({ theme: card.theme, message: 'Не удалось поделиться карточкой' })
    } finally {
      setBusy(false)
    }
  }

  function download() {
    if (!card) return
    downloadBlob(card.blob, fileName)
    setStatus('Карточка сохранена')
  }

  return (
    <Sheet open onClose={onClose} title="Карточка цитаты">
      <div
        className="mx-auto flex w-full max-w-[240px] items-center justify-center overflow-hidden rounded-[var(--radius-control)] border border-line bg-paper"
        style={{ aspectRatio: '1080 / 1350', maxHeight: '42dvh' }}
        aria-busy={rendering}
      >
        {card ? (
          <img
            src={card.url}
            alt={`Карточка цитаты из книги «${book.title}»`}
            className="h-full w-full object-contain"
          />
        ) : (
          <p className="px-6 text-center text-[13px] leading-[18px] text-muted">
            {error ? 'Карточка не собралась' : 'Собираем карточку…'}
          </p>
        )}
      </div>

      <div
        className="mt-4 grid grid-cols-2 gap-1 rounded-[var(--radius-pill)] border border-line bg-surface p-1"
        role="group"
        aria-label="Тема карточки"
      >
        {THEMES.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={theme === item.value}
            onClick={() => chooseTheme(item.value)}
            className={[
              'h-11 rounded-[var(--radius-pill)] text-[14px] leading-[20px] font-medium transition-colors duration-150',
              theme === item.value ? 'bg-accent text-accent-ink' : 'text-muted',
            ].join(' ')}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-[14px] leading-[20px] text-signal">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-3">
        <Button onClick={share} disabled={!card || busy || rendering}>
          <ShareNetwork size={20} aria-hidden />
          {busy ? 'Открываем…' : 'Поделиться'}
        </Button>
        <Button variant="outline" onClick={download} disabled={!card || busy || rendering}>
          <DownloadSimple size={20} aria-hidden />
          Скачать
        </Button>
      </div>

      <p role="status" className="mt-3 min-h-5 text-center text-[13px] leading-[18px] text-muted">
        {status}
      </p>
    </Sheet>
  )
}
