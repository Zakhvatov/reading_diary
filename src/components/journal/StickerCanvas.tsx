import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { STICKER_LABELS, type StickerPlacement } from '@/lib/stickers'
import { Sticker } from './Sticker'

type StickerCanvasProps = {
  stickers: StickerPlacement[]
  editable: boolean
  selectedId?: string | null
  onSelect?: (id: string) => void
  onMove?: (id: string, x: number, y: number) => void
}

type DragState = {
  id: string
  pointerId: number
  /** Смещение пальца от центра наклейки в пикселях. */
  offsetX: number
  offsetY: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Слой наклеек над страницей записи. В обычном чтении он прозрачен для касаний,
 * в режиме оформления наклейки можно таскать пальцем.
 */
export function StickerCanvas({
  stickers,
  editable,
  selectedId,
  onSelect,
  onMove,
}: StickerCanvasProps) {
  const layerRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null)
  const [active, setActive] = useState<DragState | null>(null)

  function pointerDown(event: ReactPointerEvent<HTMLButtonElement>, placement: StickerPlacement) {
    if (!editable) return

    const rect = layerRef.current?.getBoundingClientRect()
    if (!rect) return

    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)

    const centerX = rect.left + placement.x * rect.width
    const centerY = rect.top + placement.y * rect.height

    setActive({
      id: placement.id,
      pointerId: event.pointerId,
      offsetX: event.clientX - centerX,
      offsetY: event.clientY - centerY,
    })
    setDrag({ id: placement.id, x: placement.x, y: placement.y })
    onSelect?.(placement.id)
  }

  function pointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!active || event.pointerId !== active.pointerId) return

    const rect = layerRef.current?.getBoundingClientRect()
    if (!rect) return

    setDrag({
      id: active.id,
      x: clamp((event.clientX - active.offsetX - rect.left) / rect.width, 0.03, 0.97),
      y: clamp((event.clientY - active.offsetY - rect.top) / rect.height, 0.02, 0.98),
    })
  }

  function pointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!active || event.pointerId !== active.pointerId) return

    if (drag && drag.id === active.id) {
      onMove?.(active.id, drag.x, drag.y)
    }

    setActive(null)
    setDrag(null)
  }

  if (stickers.length === 0) return null

  return (
    <div
      ref={layerRef}
      className={['absolute inset-0 z-10', editable ? '' : 'pointer-events-none'].join(' ')}
      aria-hidden={!editable}
    >
      {stickers.map((placement) => {
        const position = drag?.id === placement.id ? drag : placement
        const selected = editable && selectedId === placement.id

        return (
          <button
            key={placement.id}
            type="button"
            tabIndex={editable ? 0 : -1}
            aria-label={editable ? `Стикер «${STICKER_LABELS[placement.sticker]}»` : undefined}
            onPointerDown={(event) => pointerDown(event, placement)}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            onPointerCancel={pointerUp}
            className={[
              'absolute touch-none rounded-[10px]',
              editable ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none',
              selected ? 'outline-2 outline-offset-2 outline-dashed outline-accent' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              left: `${position.x * 100}%`,
              top: `${position.y * 100}%`,
              transform: `translate(-50%, -50%) rotate(${placement.rotate}deg)`,
            }}
          >
            <Sticker name={placement.sticker} className="size-11" />
          </button>
        )
      })}
    </div>
  )
}
