import { Star, StarHalf } from '@phosphor-icons/react'
import type { EmotionRating, RatingScale } from '@/db/types'
import { RATING_SCALE_LABELS } from '@/lib/bookMeta'
import { formatRating, ratingFromStars, ratingToStars } from '@/lib/rating'
import { EmotionPicker } from './EmotionPicker'

export type RatingPatch = {
  rating?: number
  ratingScale?: RatingScale
  emotion?: EmotionRating
}

type RatingInputProps = {
  rating?: number
  scale: RatingScale
  emotion?: EmotionRating
  onChange: (patch: RatingPatch) => void
  disabled?: boolean
}

const SCALES: RatingScale[] = ['stars5', 'score10', 'emotion']
const STARS = [0, 1, 2, 3, 4]
const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

function decimal(value: number): string {
  return String(value).replace('.', ',')
}

export function RatingInput({
  rating,
  scale,
  emotion,
  onChange,
  disabled = false,
}: RatingInputProps) {
  const stars = rating === undefined ? 0 : ratingToStars(rating)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] leading-[18px] font-medium text-muted">Оценка</span>
        <div
          className="flex gap-1 rounded-[var(--radius-pill)] border border-line bg-surface p-1"
          role="group"
          aria-label="Шкала оценки"
        >
          {SCALES.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={scale === value}
              disabled={disabled}
              onClick={() => onChange({ ratingScale: value })}
              className={[
                'min-h-11 rounded-[var(--radius-pill)] px-2.5 text-[12px] leading-[16px] font-medium',
                scale === value ? 'bg-accent text-accent-ink' : 'text-muted',
              ].join(' ')}
            >
              {RATING_SCALE_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      {scale === 'stars5' ? (
        <div>
          <div
            className="mt-2 flex items-center"
            role="group"
            aria-label="Оценка от 0,5 до 5 звёзд"
          >
            {STARS.map((index) => {
              const diff = stars - index
              const filled = diff >= 1
              const half = !filled && diff >= 0.5

              return (
                <div key={index} className="relative h-11 flex-1">
                  <div
                    className={[
                      'pointer-events-none flex h-11 items-center justify-center',
                      filled || half ? 'text-accent' : 'text-line',
                    ].join(' ')}
                  >
                    {half ? (
                      <StarHalf size={30} weight="fill" aria-hidden />
                    ) : (
                      <Star size={30} weight={filled ? 'fill' : 'regular'} aria-hidden />
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`Оценка ${decimal(index + 0.5)} из 5`}
                    onClick={() => onChange({ rating: ratingFromStars(index + 0.5) })}
                    className="absolute inset-y-0 left-0 w-1/2 rounded-l-full"
                  />
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`Оценка ${decimal(index + 1)} из 5`}
                    onClick={() => onChange({ rating: ratingFromStars(index + 1) })}
                    className="absolute inset-y-0 right-0 w-1/2 rounded-r-full"
                  />
                </div>
              )
            })}
          </div>
          <div className="mt-1 flex min-h-11 items-center justify-between gap-3">
            <span className="text-[13px] leading-[18px] text-muted">
              {rating !== undefined ? formatRating(rating, 'stars5') : 'Без оценки'}
            </span>
            {rating !== undefined ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange({ rating: undefined })}
                className="min-h-11 px-2 text-[13px] leading-[18px] text-muted active:text-ink"
              >
                Сбросить
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {scale === 'score10' ? (
        <div>
          <div
            className="mt-2 grid grid-cols-5 gap-1.5"
            role="group"
            aria-label="Оценка от 1 до 10"
          >
            {SCORES.map((value) => {
              const selected = rating !== undefined && Math.round(rating) === value

              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  disabled={disabled}
                  onClick={() => onChange({ rating: value })}
                  className={[
                    'h-11 rounded-[var(--radius-control)] border text-[14px] leading-[20px] tabular-nums',
                    selected
                      ? 'border-accent bg-accent text-accent-ink'
                      : 'border-line bg-surface text-ink',
                  ].join(' ')}
                >
                  {value}
                </button>
              )
            })}
          </div>
          <div className="mt-1 flex min-h-11 items-center justify-between gap-3">
            <span className="text-[13px] leading-[18px] text-muted">
              {rating !== undefined ? formatRating(rating, 'score10') : 'Без оценки'}
            </span>
            {rating !== undefined ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange({ rating: undefined })}
                className="min-h-11 px-2 text-[13px] leading-[18px] text-muted active:text-ink"
              >
                Сбросить
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {scale === 'emotion' ? (
        <div className="mt-3">
          <EmotionPicker
            value={emotion}
            disabled={disabled}
            onChange={(next) => onChange({ emotion: next })}
          />
          <p className="mt-2 text-[13px] leading-[18px] text-muted">
            {rating !== undefined
              ? `Числовая оценка сохранится: ${formatRating(rating, 'score10')}`
              : 'Числовая оценка не задана.'}
          </p>
        </div>
      ) : null}
    </div>
  )
}
