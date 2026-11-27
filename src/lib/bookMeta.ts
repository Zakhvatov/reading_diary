import type { Acquisition, BookFormat, BookLinkKind, ColorLabel, RatingScale } from '@/db/types'

export const BOOK_FORMAT_LABELS: Record<BookFormat, string> = {
  paper: 'Бумажная',
  ebook: 'Электронная',
  audio: 'Аудио',
}

export const ACQUISITION_LABELS: Record<Acquisition, string> = {
  bought: 'Куплена',
  library: 'Из библиотеки',
  gift: 'Подарок',
  other: 'Другое',
}

export const COLOR_LABEL_NAMES: Record<ColorLabel, string> = {
  red: 'Красный',
  amber: 'Янтарный',
  green: 'Графит',
  blue: 'Синий',
  none: 'Без ярлыка',
}

export const BOOK_LINK_KIND_LABELS: Record<BookLinkKind, string> = {
  similar: 'Похоже',
  sequel: 'Продолжение',
  prequel: 'Приквел',
  'same-world': 'Тот же мир',
  other: 'Другое',
}

export const RATING_SCALE_LABELS: Record<RatingScale, string> = {
  stars5: '5 звёзд',
  score10: '10 баллов',
  emotion: 'Эмоция',
}
