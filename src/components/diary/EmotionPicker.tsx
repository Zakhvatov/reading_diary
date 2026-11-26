import type { EmotionRating } from '@/db/types'

const OPTIONS: { value: EmotionRating; emoji: string; label: string }[] = [
  { value: 'love', emoji: '😍', label: 'Восторг' },
  { value: 'neutral', emoji: '😐', label: 'Нормально' },
  { value: 'mindblown', emoji: '🤯', label: 'Взорвало мозг' },
]

type EmotionPickerProps = {
  value?: EmotionRating
  onChange: (emotion?: EmotionRating) => void
  disabled?: boolean
}

export function EmotionPicker({ value, onChange, disabled = false }: EmotionPickerProps) {
  return (
    <div className="flex gap-2" role="group" aria-label="Эмоция от книги">
      {OPTIONS.map((option) => {
        const selected = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(selected ? undefined : option.value)}
            className={[
              'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-control)] border px-1 py-1.5 text-[12px] leading-[16px]',
              selected
                ? 'border-accent bg-accent-soft text-ink'
                : 'border-line bg-surface text-muted',
            ].join(' ')}
          >
            <span className="text-[20px] leading-[24px]" aria-hidden>
              {option.emoji}
            </span>
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
