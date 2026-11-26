import { createElement, type ReactNode } from 'react'
import { HIGHLIGHT_COLORS, HIGHLIGHT_MARK_CLASS, type HighlightColor } from './highlights'

/**
 * Мини-Markdown для дневника: ## заголовок, **жирный**, *курсив*, - список
 * и выделение =={amber}текст== (без цвета — янтарное).
 * Возвращает React-узлы, поэтому сырой HTML остаётся текстом и не исполняется.
 *
 * Регулярка создаётся на каждый вызов: рендер вложенный, общий lastIndex сломал бы цикл.
 */
const INLINE_SOURCE =
  '\\*\\*([^*]+?)\\*\\*' +
  '|\\*([^*\\n]+?)\\*' +
  `|==\\{(${HIGHLIGHT_COLORS.join('|')})\\}(.+?)==` +
  '|==(.+?)=='

function renderInline(text: string, key: string): ReactNode[] {
  const pattern = new RegExp(INLINE_SOURCE, 'g')
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let index = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }

    const strong = match[1]
    const italic = match[2]
    const color = match[3]
    const colored = match[4]
    const plain = match[5]

    if (strong !== undefined) {
      nodes.push(
        createElement(
          'strong',
          { key: `${key}-s${index}` },
          renderInline(strong, `${key}-s${index}`),
        ),
      )
    } else if (italic !== undefined) {
      nodes.push(
        createElement('em', { key: `${key}-i${index}` }, renderInline(italic, `${key}-i${index}`)),
      )
    } else {
      const highlight = (color ?? 'amber') as HighlightColor
      const content = colored ?? plain ?? ''

      nodes.push(
        createElement(
          'mark',
          {
            key: `${key}-h${index}`,
            className: `${HIGHLIGHT_MARK_CLASS[highlight]} rounded-[3px] px-0.5 [box-decoration-break:clone]`,
          },
          renderInline(content, `${key}-h${index}`),
        ),
      )
    }

    lastIndex = match.index + (match[0]?.length ?? 0)
    index += 1
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

export function renderMarkdown(source: string): ReactNode {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let paragraph: string[] = []
  let list: string[] = []
  let key = 0

  function flushParagraph() {
    if (paragraph.length === 0) return
    const text = paragraph.join(' ').trim()
    paragraph = []
    if (!text) return

    const blockKey = `p${key}`
    key += 1
    blocks.push(createElement('p', { key: blockKey }, renderInline(text, blockKey)))
  }

  function flushList() {
    if (list.length === 0) return
    const items = list
    list = []
    const blockKey = `l${key}`
    key += 1

    blocks.push(
      createElement(
        'ul',
        { key: blockKey, className: 'flex list-disc flex-col gap-1 pl-5 marker:text-muted' },
        items.map((item, index) =>
          createElement(
            'li',
            { key: `${blockKey}-${index}` },
            renderInline(item, `${blockKey}-${index}`),
          ),
        ),
      ),
    )
  }

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) {
      flushParagraph()
      flushList()
      continue
    }

    if (trimmed.startsWith('## ')) {
      flushParagraph()
      flushList()
      const blockKey = `h${key}`
      key += 1
      blocks.push(
        createElement(
          'h2',
          {
            key: blockKey,
            className: 'mt-2 font-display text-[22px] leading-[28px] font-medium text-ink',
          },
          renderInline(trimmed.slice(3), blockKey),
        ),
      )
      continue
    }

    if (trimmed.startsWith('- ')) {
      flushParagraph()
      list.push(trimmed.slice(2))
      continue
    }

    flushList()
    paragraph.push(trimmed)
  }

  flushParagraph()
  flushList()

  if (blocks.length === 0) return null

  return createElement(
    'div',
    { className: 'flex flex-col gap-3 text-[16px] leading-[26px] text-ink' },
    blocks,
  )
}

/** Тот же мини-Markdown без разметки — для двухстрочного превью карточки. */
export function markdownToPlainText(source: string): string {
  return source
    .replace(/^##\s+/gm, '')
    .replace(/^-\s+/gm, '')
    .replace(/\*\*([^*]+?)\*\*/g, '$1')
    .replace(/\*([^*\n]+?)\*/g, '$1')
    .replace(/==\{[a-z]+\}/g, '')
    .replace(/==/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
