import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { MAX_JOURNAL_STICKERS } from '@/lib/journal'
import { STICKER_IDS, STICKER_LABELS, type StickerId } from '@/lib/stickers'
import { Sticker } from './Sticker'

type StickerPickerProps = {
  open: boolean
  count: number
  onAdd: (id: StickerId) => void
  onClose: () => void
}

/** Лист наклеек: нажатие добавляет копию на страницу, её потом можно подвинуть. */
export function StickerPicker({ open, count, onAdd, onClose }: StickerPickerProps) {
  const atLimit = count >= MAX_JOURNAL_STICKERS

  return (
    <Sheet open={open} onClose={onClose} title="Стикеры">
      <p className="text-[13px] leading-[18px] text-muted">
        Нажмите на наклейку — она появится на странице. Потом её можно перетащить пальцем.
      </p>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {STICKER_IDS.map((id) => (
          <button
            key={id}
            type="button"
            aria-label={`Добавить стикер «${STICKER_LABELS[id]}»`}
            onClick={() => onAdd(id)}
            disabled={atLimit}
            className="flex aspect-square items-center justify-center rounded-[var(--radius-control)] border border-line bg-surface active:bg-accent-soft/50 disabled:opacity-40"
          >
            <Sticker name={id} className="size-9" />
          </button>
        ))}
      </div>

      <p className="mt-3 text-[12px] leading-[16px] text-muted">
        На странице {count} из {MAX_JOURNAL_STICKERS}
      </p>

      <Button onClick={onClose} className="mt-4 w-full">
        Готово
      </Button>
    </Sheet>
  )
}
