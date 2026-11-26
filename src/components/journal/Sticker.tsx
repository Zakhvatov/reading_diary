import type { CSSProperties } from 'react'
import type { StickerId } from '@/lib/stickers'

type StickerProps = {
  name: StickerId
  className?: string
  style?: CSSProperties
}

const FLOWER_PETALS = [0, 60, 120, 180, 240, 300].map((angle) => {
  const radians = (angle * Math.PI) / 180
  return {
    cx: 32 + Math.round(13 * Math.cos(radians) * 100) / 100,
    cy: 32 + Math.round(13 * Math.sin(radians) * 100) / 100,
  }
})

/**
 * Наклейка для записи: плоская фигура с белой кромкой, как вырезанная из листа.
 * Это контент дневника, а не иконка интерфейса.
 */
export function Sticker({ name, className, style }: StickerProps) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden focusable="false" className={className} style={style}>
      <g stroke="#fff" strokeWidth="4" strokeLinejoin="round" paintOrder="stroke">
        {name === 'heart' ? (
          <path
            d="M32 55C17 45 7 35 7 23.5 7 15 13 9 21 9c5 0 9 3 11 7 2-4 6-7 11-7 8 0 14 6 14 14.5C57 35 47 45 32 55Z"
            fill="#b7412d"
          />
        ) : null}

        {name === 'star' ? (
          <path
            d="M32 6l7.6 17.4L58 25.6 45 38l3.2 19L32 48.4 15.8 57 19 38 6 25.6l18.4-2.2Z"
            fill="#b0842c"
          />
        ) : null}

        {name === 'flower' ? (
          <g>
            {FLOWER_PETALS.map((petal) => (
              <circle
                key={`${petal.cx}-${petal.cy}`}
                cx={petal.cx}
                cy={petal.cy}
                r="10"
                fill="#7c6796"
              />
            ))}
            <circle cx="32" cy="32" r="7" fill="#b0842c" />
          </g>
        ) : null}

        {name === 'leaf' ? (
          <g>
            <path d="M32 6C47 14 55 32 32 58 9 32 17 14 32 6Z" fill="#2f6b4f" />
            <path d="M32 15v36" stroke="#e8f0ea" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        ) : null}

        {name === 'moon' ? (
          <path d="M40 8A24 24 0 1 0 56 48 19 19 0 0 1 40 8Z" fill="#47597a" />
        ) : null}

        {name === 'bookmark' ? <path d="M20 7h24v50L32 46 20 57Z" fill="#8a4b38" /> : null}

        {name === 'sparkle' ? (
          <path
            d="M32 5c3 15 9 21 24 24-15 3-21 9-24 24-3-15-9-21-24-24 15-3 21-9 24-24Z"
            fill="#2f5a5c"
          />
        ) : null}
      </g>

      {name === 'sun' ? (
        <g>
          <g stroke="#c08a2e" strokeWidth="4" strokeLinecap="round">
            <path d="M32 8v6M32 50v6M8 32h6M50 32h6M15 15l4 4M45 45l4 4M49 15l-4 4M19 45l-4 4" />
          </g>
          <circle
            cx="32"
            cy="32"
            r="12"
            fill="#c08a2e"
            stroke="#fff"
            strokeWidth="4"
            paintOrder="stroke"
          />
        </g>
      ) : null}
    </svg>
  )
}

const STICKER_ROTATIONS = [-14, 10, -6, 16, -10, 7]

type StickerClusterProps = {
  stickers: StickerId[]
  className?: string
}

/** Стопка наклеек на краю записи: чуть повёрнуты, как наклеенные руками. */
export function StickerCluster({ stickers, className }: StickerClusterProps) {
  if (stickers.length === 0) return null

  return (
    <div
      className={['pointer-events-none flex items-end -space-x-2.5', className]
        .filter(Boolean)
        .join(' ')}
      aria-hidden
    >
      {stickers.map((sticker, index) => (
        <Sticker
          key={`${sticker}-${index}`}
          name={sticker}
          className="size-11 shrink-0"
          style={{ transform: `rotate(${STICKER_ROTATIONS[index % STICKER_ROTATIONS.length]}deg)` }}
        />
      ))}
    </div>
  )
}
