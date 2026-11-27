import type { Book, Quote } from '@/db/types'
import { downloadBlob } from './download'

export type QuoteCardTheme = 'paper' | 'ink'

export const QUOTE_CARD_WIDTH = 1080
export const QUOTE_CARD_HEIGHT = 1350

type QuoteCardPalette = {
  background: string
  foreground: string
  muted: string
  line: string
  accent: string
}

const THEMES: Record<QuoteCardTheme, QuoteCardPalette> = {
  paper: {
    background: '#F4F1E9',
    foreground: '#2A2620',
    muted: '#6F6A60',
    line: '#DED9CC',
    accent: '#3A3A4A',
  },
  ink: {
    background: '#1E1930',
    foreground: '#F4F1E9',
    muted: '#A79DBB',
    line: '#3A2E52',
    accent: '#B9A0FF',
  },
}

const PADDING = 100
const CONTENT_WIDTH = QUOTE_CARD_WIDTH - PADDING * 2
const QUOTE_TOP = 330
const QUOTE_HEIGHT = 660
const FOOTER_TOP = 1050
const LINE_HEIGHT = 1.42
const MAX_FONT = 68
const MIN_FONT = 40
const FONT_STEP = 2

export type QuoteCardBook = Pick<Book, 'title' | 'authors'>
export type QuoteCardQuote = Pick<Quote, 'text' | 'page' | 'chapter'>

function splitLongWord(
  word: string,
  maxWidth: number,
  measure: (line: string) => number,
): string[] {
  const chunks: string[] = []
  let chunk = ''

  for (const char of word) {
    if (chunk && measure(chunk + char) > maxWidth) {
      chunks.push(chunk)
      chunk = char
    } else {
      chunk += char
    }
  }

  if (chunk) chunks.push(chunk)
  return chunks.length > 0 ? chunks : [word]
}

/**
 * Перенос текста по словам под ширину холста. `measure` возвращает ширину
 * строки в тех же единицах, что и `maxWidth`; в браузере это
 * `ctx.measureText(line).width`, в тестах — любая монотонная функция.
 * Пустые строки между абзацами сохраняются, слишком длинные слова режутся.
 */
export function wrapText(
  text: string,
  maxWidth: number,
  measure: (line: string) => number,
): string[] {
  const source = text.replace(/\r\n?/g, '\n').trim()
  if (!source) return []

  const lines: string[] = []

  for (const paragraph of source.split('\n')) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      lines.push('')
      continue
    }

    let line = ''

    for (const word of words) {
      if (!line) {
        if (measure(word) <= maxWidth) {
          line = word
        } else {
          const chunks = splitLongWord(word, maxWidth, measure)
          lines.push(...chunks.slice(0, -1))
          line = chunks[chunks.length - 1] ?? ''
        }
        continue
      }

      const candidate = `${line} ${word}`
      if (measure(candidate) <= maxWidth) {
        line = candidate
        continue
      }

      lines.push(line)

      if (measure(word) <= maxWidth) {
        line = word
      } else {
        const chunks = splitLongWord(word, maxWidth, measure)
        lines.push(...chunks.slice(0, -1))
        line = chunks[chunks.length - 1] ?? ''
      }
    }

    if (line) lines.push(line)
  }

  return lines
}

function fitSingleLine(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text

  let value = text
  while (value.length > 1 && ctx.measureText(`${value}…`).width > maxWidth) {
    value = value.slice(0, -1)
  }
  return `${value.trimEnd()}…`
}

function layoutQuote(
  ctx: CanvasRenderingContext2D,
  text: string,
): { size: number; lines: string[] } {
  let size = MAX_FONT
  let lines: string[] = []

  while (size >= MIN_FONT) {
    ctx.font = `italic 500 ${size}px 'Literata', ui-serif, Georgia, serif`
    lines = wrapText(text, CONTENT_WIDTH, (line) => ctx.measureText(line).width)
    if (lines.length * size * LINE_HEIGHT <= QUOTE_HEIGHT) break
    size -= FONT_STEP
  }

  const finalSize = Math.max(size, MIN_FONT)
  const maxLines = Math.max(1, Math.floor(QUOTE_HEIGHT / (finalSize * LINE_HEIGHT)))

  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines)
    const last = lines[maxLines - 1] ?? ''
    lines[maxLines - 1] = last.endsWith('…') ? last : `${last.trimEnd()}…`
  }

  return { size: finalSize, lines }
}

function attribution(quote: QuoteCardQuote): string {
  const parts: string[] = []
  if (quote.page) parts.push(`с. ${quote.page}`)
  if (quote.chapter) parts.push(quote.chapter)
  return parts.join(' · ')
}

/** Имя файла для share sheet и загрузки: понятное человеку, без запрещённых символов. */
export function quoteCardFileName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

  return `цитата-${slug || 'книга'}.png`
}

async function waitForFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return

  try {
    await Promise.all([
      document.fonts.load("italic 500 56px 'Literata'"),
      document.fonts.load("500 34px 'Literata'"),
      document.fonts.load("400 24px 'Golos Text'"),
    ])
    await document.fonts.ready
  } catch {
    // Без шрифта карточка всё равно соберётся системной гарнитурой.
  }
}

/** Рисует карточку 1080×1350 и возвращает PNG. */
export async function renderQuoteCard(
  quote: QuoteCardQuote,
  book: QuoteCardBook,
  options: { theme?: QuoteCardTheme } = {},
): Promise<Blob> {
  if (typeof document === 'undefined') {
    throw new Error('Карточка цитаты доступна только в браузере')
  }

  await waitForFonts()

  const palette = THEMES[options.theme ?? 'paper']
  const canvas = document.createElement('canvas')
  canvas.width = QUOTE_CARD_WIDTH
  canvas.height = QUOTE_CARD_HEIGHT

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Не удалось подготовить холст')

  ctx.fillStyle = palette.background
  ctx.fillRect(0, 0, QUOTE_CARD_WIDTH, QUOTE_CARD_HEIGHT)

  ctx.fillStyle = palette.accent
  ctx.fillRect(PADDING, 236, 88, 6)

  const { size, lines } = layoutQuote(ctx, quote.text)
  const lineHeight = size * LINE_HEIGHT
  const blockHeight = lines.length * lineHeight
  const startY = QUOTE_TOP + Math.max(0, (QUOTE_HEIGHT - blockHeight) / 2)

  ctx.fillStyle = palette.foreground
  ctx.font = `italic 500 ${size}px 'Literata', ui-serif, Georgia, serif`
  ctx.textBaseline = 'top'

  lines.forEach((line, index) => {
    if (line) ctx.fillText(line, PADDING, startY + index * lineHeight)
  })

  ctx.fillStyle = palette.line
  ctx.fillRect(PADDING, FOOTER_TOP, CONTENT_WIDTH, 2)

  ctx.fillStyle = palette.foreground
  ctx.font = "500 34px 'Literata', ui-serif, Georgia, serif"
  ctx.fillText(fitSingleLine(ctx, book.title, CONTENT_WIDTH), PADDING, FOOTER_TOP + 52)

  if (book.authors.length > 0) {
    ctx.fillStyle = palette.muted
    ctx.font = "400 24px 'Golos Text', -apple-system, system-ui, sans-serif"
    ctx.fillText(
      fitSingleLine(ctx, book.authors.join(', '), CONTENT_WIDTH),
      PADDING,
      FOOTER_TOP + 104,
    )
  }

  ctx.fillStyle = palette.muted
  ctx.font = "400 21px 'Golos Text', -apple-system, system-ui, sans-serif"
  const meta = attribution(quote)
  if (meta) {
    ctx.fillText(fitSingleLine(ctx, meta, CONTENT_WIDTH - 240), PADDING, QUOTE_CARD_HEIGHT - 96)
  }

  ctx.fillStyle = palette.muted
  ctx.font = "500 19px 'Golos Text', -apple-system, system-ui, sans-serif"
  ctx.textAlign = 'right'
  ctx.fillText('Reading Diary', QUOTE_CARD_WIDTH - PADDING, QUOTE_CARD_HEIGHT - 96)
  ctx.textAlign = 'left'

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Не удалось собрать карточку'))
    }, 'image/png')
  })
}

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled'

/**
 * Системный share sheet с файлом; если браузер не умеет делиться файлами —
 * обычная загрузка. Отмена пользователем не превращается в скачивание.
 */
export async function shareQuoteCard(blob: Blob, fileName: string): Promise<ShareOutcome> {
  const file = new File([blob], fileName, { type: blob.type || 'image/png' })
  const canShare =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })

  if (canShare) {
    try {
      await navigator.share({ files: [file], title: 'Цитата' })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    }
  }

  downloadBlob(blob, fileName)
  return 'downloaded'
}
