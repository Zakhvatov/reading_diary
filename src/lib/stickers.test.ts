import { describe, expect, it } from 'vitest'
import {
  MAX_STICKERS,
  STICKER_MARGIN,
  clampStickerPosition,
  createSticker,
  nextFreeStickerPosition,
  normalizeStickers,
  rotateStickerRot,
  stickerSize,
} from './stickers'

describe('normalizeStickers', () => {
  it('keeps a valid sticker as is', () => {
    expect(
      normalizeStickers([
        { id: 's1', kind: 'heart', tone: 'rose', surface: 'board', x: 0.3, y: 0.4, rot: 6 },
      ]),
    ).toEqual([{ id: 's1', kind: 'heart', tone: 'rose', surface: 'board', x: 0.3, y: 0.4, rot: 6 }])
  })

  it('drops legacy stickers: strings and items without a valid kind', () => {
    expect(normalizeStickers(['heart'])).toEqual([])
    expect(normalizeStickers([{ sticker: 'heart', x: 0.2, y: 0.2 }])).toEqual([])
    expect(normalizeStickers([{ kind: 'star', tone: 'rose', surface: 'board' }])).toEqual([])
    expect(normalizeStickers([{ kind: 'heart', tone: 'gold', surface: 'board' }])).toEqual([])
    expect(normalizeStickers([{ kind: 'heart', tone: 'rose', surface: 'cover' }])).toEqual([])
  })

  it('gives fallback ids and fills missing numbers', () => {
    expect(normalizeStickers([{ kind: 'tape', tone: 'lilac', surface: 'page' }])).toEqual([
      { id: 'sticker-0', kind: 'tape', tone: 'lilac', surface: 'page', x: 0.5, y: 0.5, rot: 0 },
    ])
  })

  it('clamps coordinates and rotation', () => {
    const [sticker] = normalizeStickers([
      { kind: 'heart', tone: 'rose', surface: 'board', x: 1.4, y: -0.2, rot: 90 },
    ])

    expect(sticker).toMatchObject({ x: 1, y: 0, rot: 45 })
  })

  it('drops garbage and caps the number of stickers', () => {
    expect(normalizeStickers([null, 42, 'heart'])).toEqual([])
    expect(normalizeStickers('heart')).toEqual([])
    expect(
      normalizeStickers(
        Array.from({ length: MAX_STICKERS + 5 }, () => ({
          kind: 'heart',
          tone: 'rose',
          surface: 'board',
        })),
      ),
    ).toHaveLength(MAX_STICKERS)
  })
})

describe('sticker helpers', () => {
  it('returns the fixed pixel size of each kind', () => {
    expect(stickerSize('tape')).toEqual({ width: 112, height: 30 })
    expect(stickerSize('polaroid')).toEqual({ width: 104, height: 124 })
  })

  it('keeps the whole sticker inside the surface', () => {
    const size = stickerSize('heart')
    const insetX = (size.width / 2 + STICKER_MARGIN) / 400
    const insetY = (size.height / 2 + STICKER_MARGIN) / 500

    expect(clampStickerPosition('heart', 0, 0, 400, 500)).toEqual({ x: insetX, y: insetY })
    expect(clampStickerPosition('heart', 1, 1, 400, 500)).toEqual({
      x: 1 - insetX,
      y: 1 - insetY,
    })
    expect(clampStickerPosition('polaroid', 0.5, 0.5, 0, 0)).toEqual({ x: 0.5, y: 0.5 })
  })

  it('cycles light rotations by existing count', () => {
    const at = (count: number) =>
      createSticker('heart', 'rose', 'board', { x: 0.5, y: 0.5 }, count).rot

    expect(at(0)).toBe(-6)
    expect(at(1)).toBe(-3)
    expect(at(4)).toBe(6)
    expect(at(5)).toBe(-6)
  })

  it('wraps rotation within ±45 degrees', () => {
    expect(rotateStickerRot(0, -15)).toBe(-15)
    expect(rotateStickerRot(-45, -15)).toBe(45)
    expect(rotateStickerRot(45, 15)).toBe(-45)
    expect(rotateStickerRot(30, 15)).toBe(45)
  })

  it('places a tap-added sticker into the first free slot', () => {
    expect(nextFreeStickerPosition([])).toEqual({ x: 0.24, y: 0.18 })

    const taken = nextFreeStickerPosition([
      { id: 'a', kind: 'heart', tone: 'rose', surface: 'board', x: 0.24, y: 0.18, rot: 0 },
    ])
    expect(taken).not.toEqual({ x: 0.24, y: 0.18 })
  })

  it('creates a sticker with a unique id', () => {
    const first = createSticker('heart', 'rose', 'board', { x: 0.3, y: 0.4 })
    const second = createSticker('heart', 'rose', 'board', { x: 0.3, y: 0.4 })

    expect(first).toMatchObject({ kind: 'heart', tone: 'rose', surface: 'board', x: 0.3, y: 0.4 })
    expect(first.id).not.toBe(second.id)
  })
})
