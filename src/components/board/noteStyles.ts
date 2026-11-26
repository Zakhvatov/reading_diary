import type { BoardNoteColor } from '@/lib/board'

type BoardNoteStyle = {
  surface: string
  ink: string
  border: string
  swatch: string
}

/** Пастель — фон заметки, насыщенный тон — кружок в палитре. */
export const BOARD_NOTE_STYLES: Record<BoardNoteColor, BoardNoteStyle> = {
  sage: {
    surface: 'bg-sage',
    ink: 'text-sage-ink',
    border: 'border-sage-ink/15',
    swatch: 'bg-sage-ink',
  },
  sky: {
    surface: 'bg-sky',
    ink: 'text-sky-ink',
    border: 'border-sky-ink/15',
    swatch: 'bg-sky-ink',
  },
  peach: {
    surface: 'bg-peach',
    ink: 'text-peach-ink',
    border: 'border-peach-ink/15',
    swatch: 'bg-peach-ink',
  },
  lilac: {
    surface: 'bg-lilac',
    ink: 'text-lilac-ink',
    border: 'border-lilac-ink/15',
    swatch: 'bg-lilac-ink',
  },
  plain: {
    surface: 'bg-surface',
    ink: 'text-ink',
    border: 'border-line',
    swatch: 'bg-surface',
  },
}
