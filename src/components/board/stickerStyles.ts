import type { StickerTone } from '@/lib/stickers'

type StickerToneStyle = {
  /** Класс фона для свотчей и простых прямоугольников. */
  surface: string
  border: string
  swatch: string
  /** Цвет заливкой для инлайновых стилей и SVG. */
  fill: string
  ink: string
}

/** Пастель — фон стикера, насыщенный тон — детали и свотч в палитре. */
export const STICKER_TONE_STYLES: Record<StickerTone, StickerToneStyle> = {
  lilac: {
    surface: 'bg-lilac',
    border: 'border-lilac-ink/25',
    swatch: 'bg-lilac-ink',
    fill: 'var(--color-lilac)',
    ink: 'var(--color-lilac-ink)',
  },
  sky: {
    surface: 'bg-sky',
    border: 'border-sky-ink/25',
    swatch: 'bg-sky-ink',
    fill: 'var(--color-sky)',
    ink: 'var(--color-sky-ink)',
  },
  rose: {
    surface: 'bg-rose',
    border: 'border-rose-ink/25',
    swatch: 'bg-rose-ink',
    fill: 'var(--color-rose)',
    ink: 'var(--color-rose-ink)',
  },
  cream: {
    surface: 'bg-paper',
    border: 'border-line',
    swatch: 'bg-paper',
    fill: 'var(--color-paper)',
    ink: 'var(--color-ink)',
  },
}
