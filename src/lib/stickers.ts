/** Декоративные стикеры доски и страницы записи. */
export const STICKER_KINDS = [
  'tape',
  'scrap',
  'grid',
  'polaroid',
  'film',
  'tag',
  'cloud',
  'heart',
  'stitch',
] as const

export type StickerKind = (typeof STICKER_KINDS)[number]

/** cream рисуется цветом бумаги, остальные — пастелью темы. */
export const STICKER_TONES = ['lilac', 'sky', 'rose', 'cream'] as const

export type StickerTone = (typeof STICKER_TONES)[number]

export const STICKER_TONE_LABELS: Record<StickerTone, string> = {
  lilac: 'Лиловый',
  sky: 'Небо',
  rose: 'Розовый',
  cream: 'Бумага',
}

export const STICKER_SURFACES = ['board', 'page'] as const

export type StickerSurface = (typeof STICKER_SURFACES)[number]

export type Sticker = {
  id: string
  kind: StickerKind
  tone: StickerTone
  surface: StickerSurface
  /** Координаты центра в долях поверхности, 0…1. */
  x: number
  y: number
  /** Наклон в градусах, −45…45. */
  rot: number
}

export const MAX_STICKERS = 24
/** Отступ от края поверхности, чтобы стикер не лип к рамке. */
export const STICKER_MARGIN = 8

/** Размер каждого вида в пикселях: один и тот же на всех экранах. */
const STICKER_SIZES: Record<StickerKind, { width: number; height: number }> = {
  tape: { width: 112, height: 30 },
  scrap: { width: 120, height: 62 },
  grid: { width: 120, height: 62 },
  polaroid: { width: 104, height: 124 },
  film: { width: 112, height: 86 },
  tag: { width: 76, height: 110 },
  cloud: { width: 128, height: 86 },
  heart: { width: 54, height: 50 },
  stitch: { width: 130, height: 48 },
}

export const STICKER_LABELS: Record<StickerKind, string> = {
  tape: 'Тейп',
  scrap: 'Обрывок',
  grid: 'Клетка',
  polaroid: 'Полароид',
  film: 'Карточка',
  tag: 'Бирка',
  cloud: 'Облачко',
  heart: 'Сердечко',
  stitch: 'Стежка',
}

/** Лёгкие наклоны, чтобы стикеры не стояли шеренгой. */
const STICKER_ROTS = [-6, -3, 0, 3, 6] as const

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isStickerKind(value: unknown): value is StickerKind {
  return typeof value === 'string' && (STICKER_KINDS as readonly string[]).includes(value)
}

export function isStickerTone(value: unknown): value is StickerTone {
  return typeof value === 'string' && (STICKER_TONES as readonly string[]).includes(value)
}

export function isStickerSurface(value: unknown): value is StickerSurface {
  return typeof value === 'string' && (STICKER_SURFACES as readonly string[]).includes(value)
}

export function stickerSize(kind: StickerKind): { width: number; height: number } {
  return STICKER_SIZES[kind]
}

/** Новый стикер в заданной точке; наклон подбирается по номеру, чтобы не в ряд. */
export function createSticker(
  kind: StickerKind,
  tone: StickerTone,
  surface: StickerSurface,
  position: { x: number; y: number },
  existingCount = 0,
): Sticker {
  return {
    id: crypto.randomUUID(),
    kind,
    tone,
    surface,
    x: clamp(position.x, 0, 1),
    y: clamp(position.y, 0, 1),
    rot: STICKER_ROTS[existingCount % STICKER_ROTS.length] ?? 0,
  }
}

/** Не даёт стикеру вылезти за поверхность: координата — его центр. */
export function clampStickerPosition(
  kind: StickerKind,
  x: number,
  y: number,
  surfaceWidth: number,
  surfaceHeight: number,
): { x: number; y: number } {
  if (surfaceWidth <= 0 || surfaceHeight <= 0) return { x: 0.5, y: 0.5 }

  const { width, height } = STICKER_SIZES[kind]
  const halfX = Math.min(0.5, (width / 2 + STICKER_MARGIN) / surfaceWidth)
  const halfY = Math.min(0.5, (height / 2 + STICKER_MARGIN) / surfaceHeight)

  return {
    x: clamp(x, halfX, 1 - halfX),
    y: clamp(y, halfY, 1 - halfY),
  }
}

/** Поворот на шаг: за границами ±45 начинается с другого конца. */
export function rotateStickerRot(rot: number, delta: number): number {
  let next = clamp(rot + delta, -45, 45)
  if (delta < 0 && rot <= -45) next = 45
  if (delta > 0 && rot >= 45) next = -45
  return next
}

/** Места для стикера, добавленного тапом: как у заметок, только чаще. */
const STICKER_SLOTS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 0.24, y: 0.18 },
  { x: 0.76, y: 0.18 },
  { x: 0.24, y: 0.42 },
  { x: 0.76, y: 0.42 },
  { x: 0.24, y: 0.66 },
  { x: 0.76, y: 0.66 },
  { x: 0.24, y: 0.88 },
  { x: 0.76, y: 0.88 },
  { x: 0.5, y: 0.3 },
  { x: 0.5, y: 0.54 },
  { x: 0.5, y: 0.78 },
]

export function nextFreeStickerPosition(stickers: Sticker[]): { x: number; y: number } {
  for (const slot of STICKER_SLOTS) {
    const busy = stickers.some((sticker) => Math.hypot(sticker.x - slot.x, sticker.y - slot.y) < 0.13)
    if (!busy) return slot
  }

  const offset = (stickers.length % 5) * 0.04
  return { x: 0.5 + offset, y: 0.5 + offset }
}

/**
 * Приводит чужие данные к стикерам. Древние украшения без валидного вида —
 * не стикеры: их выбрасывают, наверху их складывают обратно в заметки.
 */
export function normalizeStickers(value: unknown): Sticker[] {
  if (!Array.isArray(value)) return []

  const stickers: Sticker[] = []

  for (const item of value) {
    if (stickers.length >= MAX_STICKERS) break

    if (!isRecord(item)) continue
    if (!isStickerKind(item.kind)) continue
    if (!isStickerTone(item.tone)) continue
    if (!isStickerSurface(item.surface)) continue

    const index = stickers.length

    stickers.push({
      id: typeof item.id === 'string' && item.id !== '' ? item.id : `sticker-${index}`,
      kind: item.kind,
      tone: item.tone,
      surface: item.surface,
      x: clamp(finite(item.x, 0.5), 0, 1),
      y: clamp(finite(item.y, 0.5), 0, 1),
      rot: clamp(finite(item.rot, 0), -45, 45),
    })
  }

  return stickers
}
