import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { markdownToPlainText, renderMarkdown } from './markdown'

function render(source: string): string {
  return renderToStaticMarkup(renderMarkdown(source))
}

describe('markdown', () => {
  it('renders paragraphs and folds single line breaks into one paragraph', () => {
    const html = render('Первый абзац.\nВторая строка.\n\nВторой абзац.')

    expect(html).toContain('<p>Первый абзац. Вторая строка.</p>')
    expect(html).toContain('<p>Второй абзац.</p>')
  })

  it('renders an h2 heading', () => {
    const html = render('## Глава первая')

    expect(html).toContain('<h2')
    expect(html).toContain('Глава первая')
  })

  it('renders bold and italic inline', () => {
    const html = render('**важно** и *мягко*')

    expect(html).toContain('<strong>важно</strong>')
    expect(html).toContain('<em>мягко</em>')
    expect(html).not.toContain('*')
  })

  it('renders an unordered list', () => {
    const html = render('- один\n- два')

    expect(html).toContain('<ul')
    expect(html.match(/<li>/g)).toHaveLength(2)
    expect(html).toContain('один')
    expect(html).toContain('два')
  })

  it('keeps raw HTML as escaped text', () => {
    const html = render('<script>alert("x")</script>')

    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&lt;/script&gt;')
  })

  it('keeps inline formatting inside list items', () => {
    const html = render('- **важно** и *мягко*')

    expect(html).toContain('<strong>важно</strong>')
    expect(html).toContain('<em>мягко</em>')
  })

  it('returns nothing for empty input', () => {
    expect(render('')).toBe('')
    expect(render('   \n\n  ')).toBe('')
  })

  it('strips markers for the card preview', () => {
    expect(markdownToPlainText('## Глава\n- **важно** и *мягко*')).toBe('Глава важно и мягко')
  })

  it('renders a coloured highlight', () => {
    const html = render('Это =={rose}важная мысль== на память.')

    expect(html).toContain('<mark')
    expect(html).toContain('bg-stab-rose')
    expect(html).toContain('важная мысль')
    expect(html).not.toContain('==')
    expect(html).not.toContain('{rose}')
  })

  it('falls back to amber for a bare highlight', () => {
    const html = render('Просто ==выделено==.')

    expect(html).toContain('bg-stab-amber')
    expect(html).toContain('выделено')
  })

  it('keeps bold inside a highlight and a highlight inside bold', () => {
    const html = render('=={sky}**важно**== и **=={sage}тоже==**')

    expect(html.match(/<mark/g)).toHaveLength(2)
    expect(html).toContain('<strong>важно</strong>')
    expect(html).toContain('<strong><mark')
  })

  it('strips highlight markers for the card preview', () => {
    expect(markdownToPlainText('=={amber}тепло== и ==свет==')).toBe('тепло и свет')
  })
})
