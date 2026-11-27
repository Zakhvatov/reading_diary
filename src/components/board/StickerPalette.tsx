import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  MAX_STICKERS,
  STICKER_KINDS,
  STICKER_LABELS,
  type StickerKind,
  type StickerSurface,
} from '@/lib/stickers'
import { StickerView } from './StickerView'

type StickerPaletteProps = {
  count: number
  /** Куда стикеры ставятся: влияет только на подсказку. */
  surface?: StickerSurface
  onAdd: (kind: StickerKind) => void
  onDrop: (kind: StickerKind, clientX: number, clientY: number) => void
}

type Press = {
  kind: StickerKind
  pointerId: number
  startX: number
  startY: number
  moved: boolean
}

const MOVE_THRESHOLD_PX = 6
const PREVIEW_SCALE = 0.5

/** Палитра стикеров: вид можно нажать или перетащить на доску. */
export function StickerPalette({ count, surface = 'board', onAdd, onDrop }: StickerPaletteProps) {
  const press = useRef<Press | null>(null)
  const [ghost, setGhost] = useState<{ kind: StickerKind; x: number; y: number } | null>(null)
  const atLimit = count >= MAX_STICKERS

  function pointerDown(event: ReactPointerEvent<HTMLButtonElement>, kind: StickerKind) {
    if (atLimit) return
    if (event.button !== 0 && event.pointerType === 'mouse') return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    press.current = {
      kind,
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

    setGhost({ kind: active.kind, x: event.clientX, y: event.clientY })
  }

  function pointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = press.current
    if (!active || active.pointerId !== event.pointerId) return

    press.current = null
    setGhost(null)

    if (active.moved) {
      onDrop(active.kind, event.clientX, event.clientY)
    } else {
      onAdd(active.kind)
    }
  }

  function pointerCancel() {
    press.current = null
    setGhost(null)
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] leading-[18px] font-medium">Новый стикер</p>
        <span className="text-[12px] leading-[16px] text-muted">
          {count} из {MAX_STICKERS}
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {STICKER_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            aria-label={`Новый стикер: ${STICKER_LABELS[kind]}`}
            disabled={atLimit}
            onPointerDown={(event) => pointerDown(event, kind)}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            onPointerCancel={pointerCancel}
            className="flex h-16 w-[72px] touch-none items-center justify-center rounded-[var(--radius-control)] border border-line bg-surface active:scale-95 disabled:opacity-40"
          >
            <StickerView sticker={{ kind, tone: 'lilac' }} scale={PREVIEW_SCALE} />
          </button>
        ))}
      </div>

      <p className="mt-2 text-[12px] leading-[16px] text-muted">
        {atLimit
          ? 'Больше на страницу не поместится'
          : count === 0
            ? surface === 'page'
              ? 'Перетащите стикер на запись или нажмите на него'
              : 'Перетащите стикер на доску или нажмите на него'
            : 'Тащите стикеры пальцем, второй тап — тон и поворот'}
      </p>

      {ghost
        ? createPortal(
            <div
              className="pointer-events-none fixed z-[60]"
              style={{ left: ghost.x, top: ghost.y, transform: 'translate(-50%, -50%)' }}
            >
              <StickerView
                sticker={{ kind: ghost.kind, tone: 'lilac' }}
                scale={PREVIEW_SCALE}
                className="opacity-80"
              />
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
