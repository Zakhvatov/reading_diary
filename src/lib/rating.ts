import type { EmotionRating, RatingScale } from '@/db/types'

export type { EmotionRating, RatingScale } from '@/db/types'

export const MAX_RATING = 10

const EMOTION_LABELS: Record<EmotionRating, string> = {
  love: 'Восторг',
  neutral: 'Нормально',
  mindblown: 'Взорвало мозг',
}

function roundHalf(value: number): number {
  return Math.round(value * 2) / 2
}

export function clampRating(value: number): number {
  if (!Number.isFinite(value)) {
    return value > 0 ? MAX_RATING : 0
  }

  return Math.min(Math.max(roundHalf(value), 0), MAX_RATING)
}

/** 4★ → 8, 4.5★ → 9. */
export function ratingFromStars(stars: number): number {
  return clampRating(stars * 2)
}

/** 8 → 4★, 9 → 4.5★. */
export function ratingToStars(rating: number): number {
  return clampRating(rating) / 2
}

export function normalizeRating(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return clampRating(value)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value)
}

export function formatRating(
  rating: number | undefined,
  scale: RatingScale,
  emotion?: EmotionRating,
): string {
  const normalized = normalizeRating(rating)

  if (scale === 'emotion' && emotion) {
    return EMOTION_LABELS[emotion]
  }

  if (normalized === undefined) {
    return 'Без оценки'
  }

  if (scale === 'stars5') {
    return `${formatNumber(ratingToStars(normalized))} из 5`
  }

  return `${formatNumber(normalized)} из 10`
}
