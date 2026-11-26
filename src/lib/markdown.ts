import { createElement, type ReactNode } from 'react'

/**
 * Мини-Markdown для дневника: ## заголовок, **жирный**, *курсив*, - список.
 * Возвращает React-узлы, поэтому сырой HTML остаётся текстом и не исполняется.
 */
const INLINE_PATTERN = /\*\*([^*]+?)\*\*|\*([^*\n]+?)\*/g

function renderInline(text: string, key: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let lastIndex = 0

  INLINE_PATTERN.lastIndex = 0
  let index = 0
  let match: RegExpExecArray | null

  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }

    const strong = match[1]
    const italic = match[2]

    if (strong !== undefined) {
      nodes.push(createElement('strong', { key: `${key}-s${index}` }, strong))
    } else if (italic !== undefined) {
      nodes.push(createElement('em', { key: `${key}-i${index}` }, italic))
    }

    lastIndex = match.index + match[0].length
    index += 1
  }

  INLINE_PATTERN.lastIndex = 0

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
    .replace(/\s+/g, ' ')
    .trim()
}
