export const STICKER_IDS = [
  'heart',
  'star',
  'flower',
  'leaf',
  'sun',
  'moon',
  'bookmark',
  'sparkle',
] as const

export type StickerId = (typeof STICKER_IDS)[number]

export const STICKER_LABELS: Record<StickerId, string> = {
  heart: 'Сердце',
  star: 'Звезда',
  flower: 'Цветок',
  leaf: 'Лист',
  sun: 'Солнце',
  moon: 'Луна',
  bookmark: 'Закладка',
  sparkle: 'Искра',
}

export function isStickerId(value: unknown): value is StickerId {
  return typeof value === 'string' && (STICKER_IDS as readonly string[]).includes(value)
}
