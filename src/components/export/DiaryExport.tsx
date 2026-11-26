import { Check, Copy, FilePdf, FileText } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { Book, BookLink, BookNote, Character, Quote } from '@/db/types'
import { downloadBlob } from '@/lib/download'
import {
  LINK_KIND_LABELS,
  bookMetadataRows,
  buildDiaryMarkdown,
  diaryMarkdownFileName,
  quoteAttribution,
  type DiaryExportData,
  type ExportMode,
} from '@/lib/markdownExport'
import { sectionsFor } from '@/lib/templates'

export type DiaryExportProps = {
  book: Book
  quotes: Quote[]
  characters: Character[]
  notes: BookNote[]
  links: BookLink[]
}

const MODES: { value: ExportMode; label: string }[] = [
  { value: 'full', label: 'Полный' },
  { value: 'public', label: 'Для других' },
]

/**
 * Контракт печати: `src/styles/print.css` скрывает всё, кроме элементов
 * с атрибутом `data-print`. Компонент держит скрытый на экране
 * `<article data-print>`, поэтому `window.print()` печатает только дневник
 * книги — без таб-бара, кнопок и остального интерфейса.
 */
function PrintableDiary({ data, mode }: { data: DiaryExportData; mode: ExportMode }) {
  const { book } = data
  const personal = mode === 'full'

  const rows = personal || book.shareable ? bookMetadataRows(book) : []
  const quotes = [...data.quotes]
    .filter((quote) => personal || quote.shareable)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const characters = personal
    ? [...data.characters].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    : []
  const plotNotes = personal
    ? data.notes
        .filter((note) => note.kind === 'plot' && note.body.trim())
        .sort(
          (a, b) =>
            (a.chapter ?? '').localeCompare(b.chapter ?? '', 'ru', { numeric: true }) ||
            a.order - b.order,
        )
    : []
  const insights = personal
    ? data.notes
        .filter((note) => note.kind === 'insight' && note.body.trim())
        .sort((a, b) => a.order - b.order)
    : []
  const links = personal
    ? [...data.links].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    : []

  const hasContent =
    rows.length +
      quotes.length +
      characters.length +
      plotNotes.length +
      insights.length +
      links.length >
    0

  return (
    <article data-print className="hidden">
      <h1>{book.title}</h1>
      {book.subtitle ? <p>{book.subtitle}</p> : null}
      {book.authors.length > 0 ? <p>{book.authors.join(', ')}</p> : null}

      {sectionsFor(book.diaryTemplate).map((id) => {
        if (id === 'overview') {
          if (rows.length === 0) return null
          return (
            <section key={id}>
              <h2>Обзор</h2>
              <dl>
                {rows.map((row) => (
                  <div key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )
        }

        if (id === 'quotes') {
          if (quotes.length === 0) return null
          return (
            <section key={id}>
              <h2>Цитаты</h2>
              {quotes.map((quote) => (
                <blockquote key={quote.id}>
                  <p>{quote.text}</p>
                  {quoteAttribution(quote) ? <footer>— {quoteAttribution(quote)}</footer> : null}
                  {quote.note ? <p>Заметка: {quote.note}</p> : null}
                </blockquote>
              ))}
            </section>
          )
        }

        if (id === 'characters') {
          if (characters.length === 0) return null
          return (
            <section key={id}>
              <h2>Персонажи</h2>
              {characters.map((character) => (
                <div key={character.id}>
                  <h3>
                    {character.name}
                    {character.role ? ` — ${character.role}` : ''}
                  </h3>
                  {character.note ? (
                    <p>
                      {character.spoiler ? '(спойлер) ' : ''}
                      {character.note}
                    </p>
                  ) : null}
                </div>
              ))}
            </section>
          )
        }

        if (id === 'plot') {
          if (plotNotes.length === 0) return null
          let chapter: string | undefined
          return (
            <section key={id}>
              <h2>Сюжет</h2>
              {plotNotes.map((note) => {
                const heading = note.chapter && note.chapter !== chapter ? note.chapter : null
                chapter = note.chapter
                return (
                  <div key={note.id}>
                    {heading ? <h3>{heading}</h3> : null}
                    <p>{note.body}</p>
                  </div>
                )
              })}
            </section>
          )
        }

        if (id === 'insights') {
          if (insights.length === 0) return null
          return (
            <section key={id}>
              <h2>Мысли</h2>
              {insights.map((note) => (
                <div key={note.id}>
                  {note.title ? <h3>{note.title}</h3> : null}
                  <p>{note.body}</p>
                  {note.tags.length > 0 ? (
                    <p>{note.tags.map((tag) => `#${tag}`).join(' ')}</p>
                  ) : null}
                </div>
              ))}
            </section>
          )
        }

        if (links.length === 0) return null
        return (
          <section key={id}>
            <h2>Связи</h2>
            <ul>
              {links.map((link) => (
                <li key={link.id}>
                  {link.targetTitle} — {LINK_KIND_LABELS[link.kind]}
                  {link.note ? `. ${link.note}` : ''}
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      {!hasContent ? <p>В этом экспорте нет записей с пометкой «можно делиться».</p> : null}
    </article>
  )
}

export function DiaryExport({ book, quotes, characters, notes, links }: DiaryExportProps) {
  const [mode, setMode] = useState<ExportMode>('full')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  const data: DiaryExportData = { book, quotes, characters, notes, links }
  const markdown = buildDiaryMarkdown(data, mode)

  function downloadMarkdown() {
    downloadBlob(
      new Blob([markdown], { type: 'text/markdown;charset=utf-8' }),
      diaryMarkdownFileName(book.title),
    )
  }

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="mt-8" aria-label="Экспорт дневника">
      <h2 className="font-display text-[20px] leading-[26px] font-medium">Экспорт</h2>
      <p className="mt-1 text-[13px] leading-[18px] text-muted">
        Markdown — для Obsidian или заметок, PDF — через печать.
      </p>

      <div
        className="mt-3 grid grid-cols-2 gap-1 rounded-[var(--radius-pill)] border border-line bg-surface p-1"
        role="group"
        aria-label="Что включить в экспорт"
      >
        {MODES.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={mode === item.value}
            onClick={() => setMode(item.value)}
            className={[
              'h-11 rounded-[var(--radius-pill)] text-[14px] leading-[20px] font-medium transition-colors duration-150',
              mode === item.value ? 'bg-accent text-accent-ink' : 'text-muted',
            ].join(' ')}
          >
            {item.label}
          </button>
        ))}
      </div>

      {mode === 'public' ? (
        <p className="mt-2 text-[13px] leading-[18px] text-muted">
          В режим «Для других» попадают только обзор книги и цитаты с пометкой «можно делиться».
        </p>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button onClick={downloadMarkdown}>
          <FileText size={20} aria-hidden />
          Markdown
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <FilePdf size={20} aria-hidden />
          PDF
        </Button>
      </div>

      <button
        type="button"
        onClick={copyMarkdown}
        className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-pill)] text-[14px] leading-[20px] font-medium text-accent active:bg-accent-soft"
      >
        {copied ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
        {copied ? 'Markdown скопирован' : 'Скопировать Markdown'}
      </button>

      <p role="status" className="sr-only">
        {copied ? 'Markdown скопирован' : ''}
      </p>

      <PrintableDiary data={data} mode={mode} />
    </section>
  )
}
