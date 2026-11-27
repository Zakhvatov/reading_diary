import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { BOARD_NOTE_MARGIN, BOARD_NOTE_SIZE, clampNotePosition, type BoardNote } from '@/lib/board'
import type { Sticker } from '@/lib/stickers'
import { BoardNoteView } from './BoardNoteView'
import { StickerLayer } from './StickerLayer'

type BoardCanvasProps = {
  notes: BoardNote[]
  /** Декоративные стикеры этой же поверхности: слой ниже заметок. */
  stickers?: Sticker[]
  selectedId: string | null
  stickerSelectedId?: string | null
  onSelect: (id: string | null) => void
  onSelectSticker?: (id: string | null) => void
  onMove: (id: string, x: number, y: number) => void
  onMoveSticker?: (id: string, x: number, y: number) => void
  onEdit: (id: string) => void
}

type Gesture = {
  id: string
  pointerId: number
  startX: number
  startY: number
  /** Смещение пальца от центра заметки. */
  offsetX: number
  offsetY: number
  dragging: boolean
  wasSelected: boolean
}

type DragPosition = { id: string; x: number; y: number }

const MOVE_THRESHOLD_PX = 6
/** Половина заметки плюс отступ: по этим границам её держит CSS. */
const NOTE_EDGE = BOARD_NOTE_SIZE / 2 + BOARD_NOTE_MARGIN

/**
 * Поле с заметками. Тап выбирает, движение после порога — перетаскивает:
 * касание больше не сдвигает заметку на пару пикселей.
 */
export function BoardCanvas({
  notes,
  stickers = [],
  selectedId,
  stickerSelectedId = null,
  onSelect,
  onSelectSticker,
  onMove,
  onMoveSticker,
  onEdit,
}: BoardCanvasProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const dragRef = useRef<DragPosition | null>(null)
  const [drag, setDrag] = useState<DragPosition | null>(null)

  function pointerDown(event: ReactPointerEvent<HTMLButtonElement>, note: BoardNote) {
    if (event.button !== 0 && event.pointerType === 'mouse') return

    const rect = event.currentTarget.getBoundingClientRect()
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)

    gesture.current = {
      id: note.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - (rect.left + rect.width / 2),
      offsetY: event.clientY - (rect.top + rect.height / 2),
      dragging: false,
      wasSelected: selectedId === note.id,
    }
    dragRef.current = null
    setDrag(null)

    if (selectedId !== note.id) onSelect(note.id)
  }

  function pointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = gesture.current
    if (!active || active.pointerId !== event.pointerId) return

    if (!active.dragging) {
      const distance = Math.hypot(event.clientX - active.startX, event.clientY - active.startY)
      if (distance < MOVE_THRESHOLD_PX) return
      active.dragging = true
    }

    const frame = frameRef.current?.getBoundingClientRect()
    if (!frame) return

    const next = clampNotePosition(
      (event.clientX - active.offsetX - frame.left) / frame.width,
      (event.clientY - active.offsetY - frame.top) / frame.height,
      frame.width,
      frame.height,
    )

    dragRef.current = { id: active.id, ...next }
    setDrag(dragRef.current)
  }

  function pointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = gesture.current
    if (!active || active.pointerId !== event.pointerId) return

    gesture.current = null
    const dropped = dragRef.current
    dragRef.current = null
    setDrag(null)

    if (active.dragging && dropped && dropped.id === active.id) {
      onMove(dropped.id, dropped.x, dropped.y)
      return
    }

    if (active.wasSelected) onEdit(active.id)
  }

  function pointerCancel(event: ReactPointerEvent<HTMLButtonElement>) {
    if (gesture.current?.pointerId !== event.pointerId) return

    gesture.current = null
    dragRef.current = null
    setDrag(null)
  }

  return (
    <div
      ref={frameRef}
      className="absolute inset-0"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onSelect(null)
      }}
    >
      {stickers.length > 0 && onSelectSticker && onMoveSticker ? (
        <StickerLayer
          stickers={stickers}
          editable
          selectedId={stickerSelectedId}
          onSelect={onSelectSticker}
          onMove={onMoveSticker}
        />
      ) : null}

      {notes.length === 0 ? (
        <p className="pointer-events-none absolute inset-x-8 top-1/2 -translate-y-1/2 text-center text-[13px] leading-[19px] text-muted">
          Нажмите цвет внизу или перетащите его сюда — появится заметка.
        </p>
      ) : null}

      {notes.map((note) => {
        const position = drag?.id === note.id ? drag : note
        const selected = selectedId === note.id

        return (
          <button
            key={note.id}
            type="button"
            aria-label={note.text.trim() ? `Заметка: ${note.text.trim()}` : 'Пустая заметка'}
            onPointerDown={(event) => pointerDown(event, note)}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            onPointerCancel={pointerCancel}
            onContextMenu={(event) => event.preventDefault()}
            className={[
              'absolute touch-none rounded-[3px] text-left select-none [-webkit-touch-callout:none]',
              drag?.id === note.id ? 'z-20' : 'z-10',
              selected ? 'outline-2 outline-offset-2 outline-accent' : 'outline-none',
            ].join(' ')}
            style={{
              left: `clamp(${NOTE_EDGE}px, ${position.x * 100}%, calc(100% - ${NOTE_EDGE}px))`,
              top: `clamp(${NOTE_EDGE}px, ${position.y * 100}%, calc(100% - ${NOTE_EDGE}px))`,
              width: BOARD_NOTE_SIZE,
              height: BOARD_NOTE_SIZE,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <BoardNoteView note={note} className="size-full" />
          </button>
        )
      })}
    </div>
  )
}
