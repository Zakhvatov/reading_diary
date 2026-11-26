import type { JournalColor } from '@/db/types'

type JournalColorStyle = {
  label: string
  surface: string
  ink: string
  stripe: string
  swatch: string
}

export const JOURNAL_COLORS: JournalColor[] = ['pine', 'amber', 'clay', 'sky', 'plum', 'moss']

/** Пастель — только фон и текст в паре; насыщенный тон — полоса и выбранный кружок. */
export const JOURNAL_COLOR_STYLES: Record<JournalColor, JournalColorStyle> = {
  pine: {
    label: 'Хвоя',
    surface: 'bg-accent-soft',
    ink: 'text-accent',
    stripe: 'bg-accent',
    swatch: 'bg-accent',
  },
  amber: {
    label: 'Янтарь',
    surface: 'bg-butter',
    ink: 'text-butter-ink',
    stripe: 'bg-butter-ink',
    swatch: 'bg-butter-ink',
  },
  clay: {
    label: 'Терракота',
    surface: 'bg-peach',
    ink: 'text-peach-ink',
    stripe: 'bg-peach-ink',
    swatch: 'bg-peach-ink',
  },
  sky: {
    label: 'Небо',
    surface: 'bg-sky',
    ink: 'text-sky-ink',
    stripe: 'bg-sky-ink',
    swatch: 'bg-sky-ink',
  },
  plum: {
    label: 'Слива',
    surface: 'bg-lilac',
    ink: 'text-lilac-ink',
    stripe: 'bg-lilac-ink',
    swatch: 'bg-lilac-ink',
  },
  moss: {
    label: 'Мох',
    surface: 'bg-sage',
    ink: 'text-sage-ink',
    stripe: 'bg-sage-ink',
    swatch: 'bg-sage-ink',
  },
}
