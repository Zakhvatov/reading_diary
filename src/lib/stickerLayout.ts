import { MAX_JOURNAL_STICKERS } from './journal'
import { isStickerId, type StickerId, type StickerPlacement } from './stickers'

export const STICKER_ROTATIONS = [-14, 10, -6, 16, -10, 7, 12, -8]

function rotation(index: number): number {
  return STICKER_ROTATIONS[index % STICKER_ROTATIONS.length] ?? 0
}

function defaultPosition(index: number): { x: number; y: number } {
  return {
    x: 0.62 + (index % 3) * 0.12,
    y: 0.06 + Math.floor(index / 3) * 0.08,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** Новая наклейка: появляется в правой верхней части страницы. */
export function createStickerPlacement(sticker: StickerId, index: number): StickerPlacement {
  return {
    id: crypto.randomUUID(),
    sticker,
    ...defaultPosition(index),
    rotate: rotation(index),
  }
}

/**
 * Приводит старые и чужие данные к расстановке: раньше это был список id без
 * координат, теперь у каждой наклейки есть точка на странице. Заодно чистит
 * координаты и отбрасывает неизвестные стикеры.
 */
export function toStickerPlacements(value: unknown): StickerPlacement[] {
  if (!Array.isArray(value)) return []

  const placements: StickerPlacement[] = []

  for (const item of value) {
    if (placements.length >= MAX_JOURNAL_STICKERS) break

    if (typeof item === 'string') {
      if (!isStickerId(item)) continue
      const index = placements.length
      placements.push({
        id: `legacy-${index}-${item}`,
        sticker: item,
        ...defaultPosition(index),
        rotate: rotation(index),
      })
      continue
    }

    if (typeof item !== 'object' || item === null) continue
    const record = item as Record<string, unknown>
    const sticker = record.sticker
    if (!isStickerId(sticker)) continue

    const index = placements.length
    const fallback = defaultPosition(index)
    placements.push({
      id:
        typeof record.id === 'string' && record.id !== ''
          ? record.id
          : `sticker-${index}-${sticker}`,
      sticker,
      x: clamp(finite(record.x, fallback.x), 0, 1),
      y: clamp(finite(record.y, fallback.y), 0, 1),
      rotate: clamp(finite(record.rotate, rotation(index)), -180, 180),
    })
  }

  return placements
}
