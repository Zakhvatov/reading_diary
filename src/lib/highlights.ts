export const HIGHLIGHT_COLORS = ['amber', 'rose', 'sky', 'sage', 'lilac'] as const

export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number]

export const HIGHLIGHT_LABELS: Record<HighlightColor, string> = {
  amber: 'янтарным',
  rose: 'розовым',
  sky: 'голубым',
  sage: 'зелёным',
  lilac: 'сиреневым',
}

/** Заливка для <mark> в тексте записи. */
export const HIGHLIGHT_MARK_CLASS: Record<HighlightColor, string> = {
  amber: 'bg-butter text-butter-ink',
  rose: 'bg-rose text-rose-ink',
  sky: 'bg-sky text-sky-ink',
  sage: 'bg-sage text-sage-ink',
  lilac: 'bg-lilac text-lilac-ink',
}

/** Кружок в палитре редактора. */
export const HIGHLIGHT_SWATCH_CLASS: Record<HighlightColor, string> = {
  amber: 'bg-butter-ink',
  rose: 'bg-rose-ink',
  sky: 'bg-sky-ink',
  sage: 'bg-sage-ink',
  lilac: 'bg-lilac-ink',
}
