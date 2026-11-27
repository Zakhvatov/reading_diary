import type { BoardNote } from '@/lib/board'
import type { Sticker } from '@/lib/stickers'
import { BOARD_NOTE_STYLES } from './noteStyles'
import { StickerView } from './StickerView'

type BoardPreviewProps = {
  notes: BoardNote[]
  /** Стикеры доски — уже отфильтрованные по поверхности. */
  stickers?: Sticker[]
}

/** Мини-доска в записи: видно, сколько бумажек и где они лежат. */
export function BoardPreview({ notes, stickers = [] }: BoardPreviewProps) {
  return (
    <div className="relative mt-3 aspect-[3/2] overflow-hidden rounded-[var(--radius-control)] border border-line bg-board">
      {stickers.map((sticker) => (
        <span
          key={sticker.id}
          className="pointer-events-none absolute"
          style={{
            left: `${sticker.x * 100}%`,
            top: `${sticker.y * 100}%`,
            transform: `translate(-50%, -50%) rotate(${sticker.rot}deg)`,
          }}
        >
          <StickerView sticker={sticker} scale={0.5} />
        </span>
      ))}

      {notes.length === 0 && stickers.length === 0 ? (
        <p className="absolute inset-0 grid place-items-center text-[12px] leading-[16px] text-muted">
          Пока пусто
        </p>
      ) : (
        notes.map((note) => {
          const style = BOARD_NOTE_STYLES[note.color]

          return (
            <span
              key={note.id}
              className={[
                'absolute w-[16%] rounded-[2px] border aspect-square',
                style.surface,
                style.border,
              ].join(' ')}
              style={{
                left: `${note.x * 100}%`,
                top: `${note.y * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          )
        })
      )}
    </div>
  )
}
