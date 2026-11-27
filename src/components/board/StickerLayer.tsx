import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import {
  STICKER_MARGIN,
  STICKER_LABELS,
  clampStickerPosition,
  stickerSize,
  type Sticker,
} from '@/lib/stickers'
import { StickerView } from './StickerView'

type StickerLayerProps = {
  /** Уже отфильтрованные по поверхности стикеры. */
  stickers: Sticker[]
  editable: boolean
  selectedId: string | null
  onSelect: (id: string | null) => void
  onMove: (id: string, x: number, y: number) => void
  /** Меньше единицы — для мини-превью. */
  scale?: number
}

type Gesture = {
  id: string
  pointerId: number
  startX: number
  startY: number
  /** Смещение пальца от центра стикера. */
  offsetX: number
  offsetY: number
  dragging: boolean
}

type DragPosition = { id: string; x: number; y: number }

const MOVE_THRESHOLD_PX = 6

/**
 * Слой стикеров под заметками. Тап выбирает, движение после порога
 * перетаскивает: тот же жест, что у заметок на доске. Слой вне
 * редактирования виден, но не отвечает на касания.
 */
export function StickerLayer({
  stickers,
  editable,
  selectedId,
  onSelect,
  onMove,
  scale = 1,
}: StickerLayerProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const dragRef = useRef<DragPosition | null>(null)
  const [drag, setDrag] = useState<DragPosition | null>(null)

  function pointerDown(event: ReactPointerEvent<HTMLButtonElement>, sticker: Sticker) {
    if (!editable) return
    if (event.button !== 0 && event.pointerType === 'mouse') return

    const rect = event.currentTarget.getBoundingClientRect()
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)

    gesture.current = {
      id: sticker.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - (rect.left + rect.width / 2),
      offsetY: event.clientY - (rect.top + rect.height / 2),
      dragging: false,
    }
    dragRef.current = null
    setDrag(null)

    if (selectedId !== sticker.id) onSelect(sticker.id)
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

    const sticker = stickers.find((item) => item.id === active.id)
    if (!sticker) return

    const next = clampStickerPosition(
      sticker.kind,
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
    }
  }

  function pointerCancel(event: ReactPointerEvent<HTMLButtonElement>) {
    if (gesture.current?.pointerId !== event.pointerId) return

    gesture.current = null
    dragRef.current = null
    setDrag(null)
  }

  return (
    <div ref={frameRef} className={`absolute inset-0 ${editable ? '' : 'pointer-events-none'}`}>
      {stickers.map((sticker) => {
        const position = drag?.id === sticker.id ? drag : sticker
        const { width, height } = stickerSize(sticker.kind)
        const edgeX = width / 2 + STICKER_MARGIN
        const edgeY = height / 2 + STICKER_MARGIN
        const selected = selectedId === sticker.id

        return (
          <button
            key={sticker.id}
            type="button"
            aria-label={`Стикер: ${STICKER_LABELS[sticker.kind]}`}
            onPointerDown={(event) => pointerDown(event, sticker)}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            onPointerCancel={pointerCancel}
            onContextMenu={(event) => event.preventDefault()}
            className={[
              'absolute touch-none select-none [-webkit-touch-callout:none]',
              editable ? 'pointer-events-auto' : 'pointer-events-none',
              drag?.id === sticker.id ? 'z-20' : 'z-0',
              selected ? 'outline-2 outline-offset-2 outline-accent' : 'outline-none',
            ].join(' ')}
            style={{
              left: `clamp(${edgeX}px, ${position.x * 100}%, calc(100% - ${edgeX}px))`,
              top: `clamp(${edgeY}px, ${position.y * 100}%, calc(100% - ${edgeY}px))`,
              width: Math.round(width * scale),
              height: Math.round(height * scale),
              transform: `translate(-50%, -50%) rotate(${sticker.rot}deg)`,
            }}
          >
            <StickerView sticker={sticker} scale={scale} className="pointer-events-none" />
          </button>
        )
      })}
    </div>
  )
}
