import type { ColorLabel } from '@/db/types'
import { COLOR_LABEL_NAMES } from '@/lib/bookMeta'

const DOTS: Record<Exclude<ColorLabel, 'none'>, string> = {
  red: 'var(--mark-red, var(--signal))',
  amber: 'var(--mark-amber, var(--gold))',
  green: 'var(--mark-green, var(--color-sage-ink))',
  blue: 'var(--mark-blue, var(--color-sky-ink))',
}

const OPTIONS: ColorLabel[] = ['red', 'amber', 'green', 'blue', 'none']

type ColorLabelDotProps = {
  label: ColorLabel
  className?: string
}

export function ColorLabelDot({ label, className }: ColorLabelDotProps) {
  if (label === 'none') {
    return (
      <span
        aria-hidden
        className={['inline-block size-2 rounded-full border border-line', className]
          .filter(Boolean)
          .join(' ')}
      />
    )
  }

  return (
    <span
      aria-hidden
      style={{ backgroundColor: DOTS[label] }}
      className={['inline-block size-2 rounded-full', className].filter(Boolean).join(' ')}
    />
  )
}

type ColorLabelPickerProps = {
  value: ColorLabel
  onChange: (label: ColorLabel) => void
  disabled?: boolean
}

export function ColorLabelPicker({ value, onChange, disabled = false }: ColorLabelPickerProps) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Цветной ярлык">
      {OPTIONS.map((label) => {
        const selected = label === value

        return (
          <button
            key={label}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={COLOR_LABEL_NAMES[label]}
            disabled={disabled}
            onClick={() => onChange(label)}
            className={[
              'flex size-11 items-center justify-center rounded-full',
              selected ? 'bg-accent-soft' : 'active:bg-accent-soft',
            ].join(' ')}
          >
            <ColorLabelDot label={label} className={selected ? 'size-2.5' : undefined} />
          </button>
        )
      })}
      <span className="ml-1 text-[13px] leading-[18px] text-muted">{COLOR_LABEL_NAMES[value]}</span>
    </div>
  )
}
