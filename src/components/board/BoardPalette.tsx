import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  BOARD_NOTE_COLORS,
  BOARD_NOTE_LABELS,
  MAX_BOARD_NOTES,
  type BoardNoteColor,
} from '@/lib/board'
import { BoardNoteView } from './BoardNoteView'
import { BOARD_NOTE_STYLES } from './noteStyles'

type BoardPaletteProps = {
  count: number
  onAdd: (color: BoardNoteColor) => void
  onDrop: (color: BoardNoteColor, clientX: number, clientY: number) => void
}

type Press = {
  color: BoardNoteColor
  pointerId: number
  startX: number
  startY: number
  moved: boolean
}

const MOVE_THRESHOLD_PX = 6

/** Палитра бумаги: цвет можно нажать или перетащить на доску. */
export function BoardPalette({ count, onAdd, onDrop }: BoardPaletteProps) {
  const press = useRef<Press | null>(null)
  const [ghost, setGhost] = useState<{ color: BoardNoteColor; x: number; y: number } | null>(null)
  const atLimit = count >= MAX_BOARD_NOTES

  function pointerDown(event: ReactPointerEvent<HTMLButtonElement>, color: BoardNoteColor) {
    if (atLimit) return
    if (event.button !== 0 && event.pointerType === 'mouse') return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    press.current = {
      color,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    }
  }

  function pointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = press.current
    if (!active || active.pointerId !== event.pointerId) return

    if (!active.moved) {
      const distance = Math.hypot(event.clientX - active.startX, event.clientY - active.startY)
      if (distance < MOVE_THRESHOLD_PX) return
      active.moved = true
    }

    setGhost({ color: active.color, x: event.clientX, y: event.clientY })
  }

  function pointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = press.current
    if (!active || active.pointerId !== event.pointerId) return

    press.current = null
    setGhost(null)

    if (active.moved) {
      onDrop(active.color, event.clientX, event.clientY)
    } else {
      onAdd(active.color)
    }
  }

  function pointerCancel() {
    press.current = null
    setGhost(null)
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] leading-[18px] font-medium">Новая заметка</p>
        <span className="text-[12px] leading-[16px] text-muted">
          {count} из {MAX_BOARD_NOTES}
        </span>
      </div>

      <div className="mt-2.5 flex items-center gap-2.5">
        {BOARD_NOTE_COLORS.map((color) => {
          const style = BOARD_NOTE_STYLES[color]

          return (
            <button
              key={color}
              type="button"
              aria-label={`Новая заметка: ${BOARD_NOTE_LABELS[color]}`}
              disabled={atLimit}
              onPointerDown={(event) => pointerDown(event, color)}
              onPointerMove={pointerMove}
              onPointerUp={pointerUp}
              onPointerCancel={pointerCancel}
              className={[
                'size-11 touch-none rounded-full border active:scale-95 disabled:opacity-40',
                style.surface,
                style.border,
              ].join(' ')}
            />
          )
        })}
      </div>

      <p className="mt-2 text-[12px] leading-[16px] text-muted">
        {atLimit
          ? 'Больше на страницу не поместится'
          : count === 0
            ? 'Перетащите цвет на доску или нажмите на него'
            : 'Тащите заметки пальцем, второе касание — текст'}
      </p>

      {ghost
        ? createPortal(
            <div
              className="pointer-events-none fixed z-[60]"
              style={{ left: ghost.x, top: ghost.y, transform: 'translate(-50%, -50%)' }}
            >
              <BoardNoteView
                note={{ id: 'ghost', color: ghost.color, text: '', x: 0, y: 0 }}
                className="h-28 w-28 opacity-80"
              />
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
