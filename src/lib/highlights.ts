/**
 * Палитра выделения «Stabilo Candy»: 10 пастельных маркеров.
 * Ключи сохраняются в тексте записи (=={rose}...==), поэтому старые
 * имена нельзя менять — меняются только оттенки и добавляются новые.
 * Цвета канцелярские: одинаковые во всех темах (токены stab-*).
 */
export const HIGHLIGHT_COLORS = [
  'rose',
  'peach',
  'lime',
  'sky',
  'sage',
  'aqua',
  'lilac',
  'blush',
  'apricot',
  'amber',
] as const

export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number]

export const HIGHLIGHT_LABELS: Record<HighlightColor, string> = {
  rose: 'розовым',
  peach: 'коралловым',
  lime: 'лаймовым',
  sky: 'голубым',
  sage: 'мятным',
  aqua: 'бирюзовым',
  lilac: 'сиреневым',
  blush: 'пудровым',
  apricot: 'персиковым',
  amber: 'жёлтым',
}

/** Заливка для <mark> в тексте записи. */
export const HIGHLIGHT_MARK_CLASS: Record<HighlightColor, string> = {
  rose: 'bg-stab-rose text-stab-rose-ink',
  peach: 'bg-stab-peach text-stab-peach-ink',
  lime: 'bg-stab-lime text-stab-lime-ink',
  sky: 'bg-stab-sky text-stab-sky-ink',
  sage: 'bg-stab-sage text-stab-sage-ink',
  aqua: 'bg-stab-aqua text-stab-aqua-ink',
  lilac: 'bg-stab-lilac text-stab-lilac-ink',
  blush: 'bg-stab-blush text-stab-blush-ink',
  apricot: 'bg-stab-apricot text-stab-apricot-ink',
  amber: 'bg-stab-amber text-stab-amber-ink',
}

/** Кружок в палитре редактора. */
export const HIGHLIGHT_SWATCH_CLASS: Record<HighlightColor, string> = {
  rose: 'bg-stab-rose',
  peach: 'bg-stab-peach',
  lime: 'bg-stab-lime',
  sky: 'bg-stab-sky',
  sage: 'bg-stab-sage',
  aqua: 'bg-stab-aqua',
  lilac: 'bg-stab-lilac',
  blush: 'bg-stab-blush',
  apricot: 'bg-stab-apricot',
  amber: 'bg-stab-amber',
}
