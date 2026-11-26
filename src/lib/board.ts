/** Цвета бумаги для заметок на доске. */
export const BOARD_NOTE_COLORS = ['sage', 'sky', 'peach', 'lilac', 'plain'] as const

export type BoardNoteColor = (typeof BOARD_NOTE_COLORS)[number]

export const BOARD_NOTE_LABELS: Record<BoardNoteColor, string> = {
  sage: 'Шалфей',
  sky: 'Небо',
  peach: 'Персик',
  lilac: 'Лиловый',
  plain: 'Белая',
}

export const MAX_BOARD_NOTES = 16
export const BOARD_NOTE_MAX_LENGTH = 140
/** Сторона заметки в пикселях: одна и та же на всех экранах. */
export const BOARD_NOTE_SIZE = 132
/** Отступ от края поля, чтобы бумажка не липла к рамке. */
export const BOARD_NOTE_MARGIN = 8

/** Заметка на доске записи. Координаты — центр в долях поля, 0…1. */
export type BoardNote = {
  id: string
  color: BoardNoteColor
  text: string
  x: number
  y: number
}

export const BOARD_NOTE_SLOTS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 0.28, y: 0.14 },
  { x: 0.72, y: 0.14 },
  { x: 0.28, y: 0.38 },
  { x: 0.72, y: 0.38 },
  { x: 0.28, y: 0.62 },
  { x: 0.72, y: 0.62 },
  { x: 0.28, y: 0.82 },
  { x: 0.72, y: 0.82 },
  { x: 0.5, y: 0.26 },
  { x: 0.5, y: 0.5 },
  { x: 0.5, y: 0.74 },
  { x: 0.5, y: 0.14 },
]

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isBoardNoteColor(value: unknown): value is BoardNoteColor {
  return typeof value === 'string' && (BOARD_NOTE_COLORS as readonly string[]).includes(value)
}

function colorAt(index: number): BoardNoteColor {
  return BOARD_NOTE_COLORS[index % BOARD_NOTE_COLORS.length] ?? 'plain'
}

function legacyPosition(index: number): { x: number; y: number } {
  return {
    x: 0.62 + (index % 3) * 0.12,
    y: 0.06 + Math.floor(index / 3) * 0.08,
  }
}

/** Новая заметка в заданной точке; текст появляется в редакторе. */
export function createBoardNote(
  color: BoardNoteColor,
  position: { x: number; y: number },
): BoardNote {
  return {
    id: crypto.randomUUID(),
    color,
    text: '',
    x: clamp(position.x, 0, 1),
    y: clamp(position.y, 0, 1),
  }
}

/**
 * Приводит чужие и старые данные к заметкам. Старые стикеры были просто
 * украшениями без текста, поэтому становятся пустыми бумажками на тех же
 * местах: раскладка не пропадает, и в них сразу можно писать.
 */
export function toBoardNotes(value: unknown): BoardNote[] {
  if (!Array.isArray(value)) return []

  const notes: BoardNote[] = []

  for (const item of value) {
    if (notes.length >= MAX_BOARD_NOTES) break

    const index = notes.length
    const fallback = legacyPosition(index)
    const fallbackColor = colorAt(index)

    if (typeof item === 'string') {
      notes.push({ id: `note-${index}`, color: fallbackColor, text: '', ...fallback })
      continue
    }

    if (!isRecord(item)) continue

    const hasNoteShape = isBoardNoteColor(item.color) || typeof item.text === 'string'
    const hasPlacement = typeof item.x === 'number' || typeof item.sticker === 'string'
    if (!hasNoteShape && !hasPlacement) continue

    const text = typeof item.text === 'string' ? item.text.slice(0, BOARD_NOTE_MAX_LENGTH) : ''

    notes.push({
      id: typeof item.id === 'string' && item.id !== '' ? item.id : `note-${index}`,
      color: isBoardNoteColor(item.color) ? item.color : fallbackColor,
      // Старые стикеры не умели хранить текст: даже если поле есть, оно пустое.
      text,
      x: clamp(finite(item.x, fallback.x), 0, 1),
      y: clamp(finite(item.y, fallback.y), 0, 1),
    })
  }

  return notes
}

/** Первое свободное место из сетки, иначе центр — заметки могут накладываться. */
export function nextFreePosition(notes: BoardNote[]): { x: number; y: number } {
  for (const slot of BOARD_NOTE_SLOTS) {
    const busy = notes.some((note) => Math.hypot(note.x - slot.x, note.y - slot.y) < 0.16)
    if (!busy) return slot
  }

  const offset = (notes.length % 5) * 0.04
  return { x: 0.5 + offset, y: 0.5 + offset }
}

/** Не даёт заметке вылезти за поле: координата — её центр. */
export function clampNotePosition(
  x: number,
  y: number,
  boardWidth: number,
  boardHeight: number,
  size = BOARD_NOTE_SIZE,
): { x: number; y: number } {
  if (boardWidth <= 0 || boardHeight <= 0) return { x: 0.5, y: 0.5 }

  const halfX = Math.min(0.5, (size / 2 + BOARD_NOTE_MARGIN) / boardWidth)
  const halfY = Math.min(0.5, (size / 2 + BOARD_NOTE_MARGIN) / boardHeight)

  return {
    x: clamp(x, halfX, 1 - halfX),
    y: clamp(y, halfY, 1 - halfY),
  }
}

/** Чем больше текста, тем мельче шрифт — иначе он не влезает в бумажку. */
export function noteFontSize(text: string): number {
  const length = text.trim().length
  if (length <= 48) return 14
  if (length <= 96) return 12
  return 11
}

export function notesCountLabel(count: number): string {
  if (count === 0) return 'нет заметок'

  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return `${count} заметка`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} заметки`
  return `${count} заметок`
}
