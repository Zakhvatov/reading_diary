import type { ReactNode } from 'react'
import { Heart, Sparkle } from '@phosphor-icons/react'
import { stickerSize, type Sticker, type StickerTone } from '@/lib/stickers'
import { STICKER_TONE_STYLES } from './stickerStyles'

type StickerViewProps = {
  sticker: Pick<Sticker, 'kind' | 'tone'>
  className?: string
  /** Меньше единицы — для мини-превью: палитра и доска в записи. */
  scale?: number
}

const TAPE_CLIP =
  'polygon(3% 0%, 100% 4%, 97% 30%, 100% 55%, 97% 80%, 100% 100%, 3% 96%, 0% 75%, 3% 50%, 0% 22%)'

const TORN_CLIP =
  'polygon(2% 6%, 8% 0%, 30% 4%, 55% 0%, 82% 5%, 100% 2%, 98% 30%, 100% 55%, 97% 80%, 100% 96%, 70% 100%, 45% 95%, 20% 100%, 0% 94%, 3% 70%, 0% 45%, 4% 22%)'

const TAG_CLIP = 'polygon(28% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 28%)'

/** Прозрачный тейп с полоской: им же крепятся полароид и карточка. */
function TapeStrip({ tone, className }: { tone: StickerTone; className?: string }) {
  const style = STICKER_TONE_STYLES[tone]

  return (
    <div className={`absolute ${className ?? ''}`} style={{ clipPath: TAPE_CLIP }}>
      <div className="absolute inset-0" style={{ backgroundColor: style.fill, opacity: 0.6 }} />
      <div
        className="absolute inset-0"
        style={{
          background:
            'repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.35) 0px, rgba(255, 255, 255, 0.35) 5px, transparent 5px, transparent 10px)',
        }}
      />
    </div>
  )
}

/** Вид стикера: один и тот же на доске, в превью и в палитре. */
export function StickerView({ sticker, className, scale = 1 }: StickerViewProps) {
  const { kind, tone } = sticker
  const style = STICKER_TONE_STYLES[tone]
  const size = stickerSize(kind)
  const { width, height } = {
    width: Math.round(size.width * scale),
    height: Math.round(size.height * scale),
  }

  let content: ReactNode

  switch (kind) {
    case 'tape':
      content = <TapeStrip tone={tone} className="inset-0" />
      break

    case 'scrap':
      content = (
        <div className="absolute inset-0" style={{ clipPath: TORN_CLIP }}>
          <div
            className="absolute inset-0"
            style={{ backgroundColor: style.fill, opacity: 0.9 }}
          />
          <div
            className="absolute inset-[1.5px]"
            style={{ clipPath: TORN_CLIP, backgroundColor: style.fill }}
          />
        </div>
      )
      break

    case 'grid': {
      const line = `color-mix(in oklab, ${style.ink} 22%, transparent)`
      content = (
        <div className="absolute inset-0" style={{ clipPath: TORN_CLIP }}>
          <div
            className="absolute inset-0"
            style={{ backgroundColor: style.fill, opacity: 0.9 }}
          />
          <div
            className="absolute inset-[1.5px]"
            style={{ clipPath: TORN_CLIP, backgroundColor: style.fill }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `repeating-linear-gradient(0deg, ${line} 0px, ${line} 1px, transparent 1px, transparent 9px), repeating-linear-gradient(90deg, ${line} 0px, ${line} 1px, transparent 1px, transparent 9px)`,
            }}
          />
        </div>
      )
      break
    }

    case 'polaroid':
      content = (
        <div className="absolute inset-0 rounded-[3px] border border-line bg-paper p-[6px] pb-[20px]">
          <div className="size-full rounded-[2px]" style={{ backgroundColor: style.fill }} />
        </div>
      )
      break

    case 'film':
      content = (
        <div
          className="absolute inset-0 rounded-[4px]"
          style={{
            backgroundColor: style.fill,
            border: `1px solid color-mix(in oklab, ${style.ink} 20%, transparent)`,
          }}
        >
          <Heart
            weight="fill"
            size={13}
            aria-hidden
            className="absolute bottom-1 right-1.5"
            style={{ color: style.ink, opacity: 0.45 }}
          />
        </div>
      )
      break

    case 'tag':
      content = (
        <div className="absolute inset-0" style={{ clipPath: TAG_CLIP }}>
          <div className="absolute inset-0" style={{ backgroundColor: style.fill }} />
          <div
            className="absolute left-1/2 top-[13px] size-3 -translate-x-1/2 rounded-full"
            style={{
              border: `2px solid color-mix(in oklab, ${style.ink} 40%, transparent)`,
            }}
          />
          <Sparkle
            weight="fill"
            size={13}
            aria-hidden
            className="absolute bottom-3 left-1/2 -translate-x-1/2"
            style={{ color: style.ink, opacity: 0.55 }}
          />
        </div>
      )
      break

    case 'cloud':
      content = (
        <>
          <svg viewBox="0 0 128 86" className="absolute inset-0 size-full" aria-hidden>
            <path
              d="M20 64 A14 14 0 0 1 26 38 A13 13 0 0 1 48 26 A14 14 0 0 1 74 24 A13 13 0 0 1 98 32 A17 17 0 0 1 108 64 Z"
              fill={style.fill}
              stroke="var(--color-line)"
              strokeWidth={1.5}
            />
          </svg>
          <Sparkle
            weight="fill"
            size={13}
            aria-hidden
            className="absolute inset-0 m-auto mb-5 size-fit"
            style={{ color: style.ink, opacity: 0.55 }}
          />
        </>
      )
      break

    case 'heart':
      content = (
        <svg viewBox="0 0 54 50" className="absolute inset-0 size-full" aria-hidden>
          <path
            d="M27 44 C12 33 4 24 4 15 C4 7 10 3 16 3 C21 3 25 6 27 10 C29 6 33 3 38 3 C44 3 50 7 50 15 C50 24 42 33 27 44 Z"
            fill={style.fill}
            stroke={style.ink}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </svg>
      )
      break

    case 'stitch':
      content = (
        <div
          className="absolute inset-0 rounded-full border-2 border-dashed bg-paper"
          style={{ borderColor: `color-mix(in oklab, ${style.ink} 45%, transparent)` }}
        >
          <Heart
            weight="fill"
            size={13}
            aria-hidden
            className="absolute inset-0 m-auto size-fit"
            style={{ color: style.ink, opacity: 0.5 }}
          />
        </div>
      )
      break
  }

  return (
    <div
      className={`relative select-none ${className ?? ''}`}
      style={{
        width,
        height,
        filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.16))',
      }}
    >
      {content}
      {kind === 'polaroid' ? (
        <TapeStrip tone={tone} className="top-[-7px] left-1/2 h-[15px] w-[46px] -translate-x-1/2 -rotate-3" />
      ) : null}
      {kind === 'film' ? (
        <TapeStrip tone={tone} className="top-[-6px] left-1/2 h-[13px] w-[52px] -translate-x-1/2 rotate-2" />
      ) : null}
    </div>
  )
}
