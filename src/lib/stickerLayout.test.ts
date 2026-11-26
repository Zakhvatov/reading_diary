import { describe, expect, it } from 'vitest'
import { MAX_JOURNAL_STICKERS } from './journal'
import { createStickerPlacement, toStickerPlacements } from './stickerLayout'

describe('toStickerPlacements', () => {
  it('turns legacy sticker ids into placements with coordinates', () => {
    const placements = toStickerPlacements(['heart', 'star'])

    expect(placements).toEqual([
      { id: 'legacy-0-heart', sticker: 'heart', x: 0.62, y: 0.06, rotate: -14 },
      { id: 'legacy-1-star', sticker: 'star', x: 0.74, y: 0.06, rotate: 10 },
    ])
  })

  it('keeps placement coordinates and clamps them to the page', () => {
    const [placement] = toStickerPlacements([
      { id: 'custom', sticker: 'moon', x: 1.4, y: -0.2, rotate: 400 },
    ])

    expect(placement).toEqual({ id: 'custom', sticker: 'moon', x: 1, y: 0, rotate: 180 })
  })

  it('drops unknown stickers and non-placements', () => {
    expect(
      toStickerPlacements(['nope', { sticker: 'nope' }, null, 42, { sticker: 'leaf' }]),
    ).toEqual([
      {
        id: 'sticker-0-leaf',
        sticker: 'leaf',
        x: 0.62,
        y: 0.06,
        rotate: -14,
      },
    ])
  })

  it('caps the number of stickers', () => {
    const placements = toStickerPlacements(
      Array.from({ length: MAX_JOURNAL_STICKERS + 5 }, () => 'sun'),
    )

    expect(placements).toHaveLength(MAX_JOURNAL_STICKERS)
  })

  it('returns an empty list for garbage', () => {
    expect(toStickerPlacements(undefined)).toEqual([])
    expect(toStickerPlacements('heart')).toEqual([])
    expect(toStickerPlacements({})).toEqual([])
  })
})

describe('createStickerPlacement', () => {
  it('puts a new sticker on the page with a unique id', () => {
    const first = createStickerPlacement('heart', 0)
    const second = createStickerPlacement('heart', 1)

    expect(first.sticker).toBe('heart')
    expect(first.x).toBeGreaterThanOrEqual(0)
    expect(first.x).toBeLessThanOrEqual(1)
    expect(first.y).toBeGreaterThanOrEqual(0)
    expect(first.y).toBeLessThanOrEqual(1)
    expect(first.id).not.toBe(second.id)
  })
})
