import { Check } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { MAX_JOURNAL_STICKERS } from '@/lib/journal'
import { STICKER_IDS, STICKER_LABELS, type StickerId } from '@/lib/stickers'
import { Sticker } from './Sticker'

type StickerPickerProps = {
  open: boolean
  selected: StickerId[]
  onToggle: (id: StickerId) => void
  onClose: () => void
}

export function StickerPicker({ open, selected, onToggle, onClose }: StickerPickerProps) {
  const atLimit = selected.length >= MAX_JOURNAL_STICKERS

  return (
    <Sheet open={open} onClose={onClose} title="Стикеры">
      <p className="text-[13px] leading-[18px] text-muted">
        Наклейки лягут на запись стопкой. Их можно убрать в любой момент.
      </p>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {STICKER_IDS.map((id) => {
          const active = selected.includes(id)
          const disabled = atLimit && !active

          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              aria-label={STICKER_LABELS[id]}
              onClick={() => onToggle(id)}
              disabled={disabled}
              className={[
                'relative flex aspect-square items-center justify-center rounded-[var(--radius-control)]',
                active
                  ? 'border-2 border-accent bg-accent-soft'
                  : 'border border-line bg-surface active:bg-accent-soft/50',
                disabled ? 'opacity-40' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <Sticker name={id} className="size-9" />
              {active ? (
                <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-accent text-accent-ink">
                  <Check size={11} weight="bold" aria-hidden />
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <p className="mt-3 text-[12px] leading-[16px] text-muted">
        Выбрано {selected.length} из {MAX_JOURNAL_STICKERS}
      </p>

      <Button onClick={onClose} className="mt-4 w-full">
        Готово
      </Button>
    </Sheet>
  )
}
