import { describe, expect, it } from 'vitest'
import {
  BOARD_NOTE_MARGIN,
  BOARD_NOTE_MAX_LENGTH,
  BOARD_NOTE_SIZE,
  BOARD_NOTE_SLOTS,
  MAX_BOARD_NOTES,
  clampNotePosition,
  createBoardNote,
  nextFreePosition,
  noteFontSize,
  notesCountLabel,
  toBoardNotes,
} from './board'

describe('toBoardNotes', () => {
  it('turns legacy sticker ids into empty notes on the page', () => {
    expect(toBoardNotes(['heart', 'star'])).toEqual([
      { id: 'note-0', color: 'sage', text: '', x: 0.62, y: 0.06 },
      { id: 'note-1', color: 'sky', text: '', x: 0.74, y: 0.06 },
    ])
  })

  it('keeps placements from older versions as paper at the same spot', () => {
    expect(
      toBoardNotes([{ id: 'legacy-0-heart', sticker: 'heart', x: 0.4, y: 0.3, rotate: 8 }]),
    ).toEqual([{ id: 'legacy-0-heart', color: 'sage', text: '', x: 0.4, y: 0.3 }])
  })

  it('keeps a real note with text and colour', () => {
    expect(toBoardNotes([{ id: 'n1', color: 'lilac', text: 'Мысль', x: 0.2, y: 0.8 }])).toEqual([
      { id: 'n1', color: 'lilac', text: 'Мысль', x: 0.2, y: 0.8 },
    ])
  })

  it('clamps coordinates and cuts text that is too long', () => {
    const [note] = toBoardNotes([
      { id: 'n1', color: 'peach', text: 'я'.repeat(400), x: 1.4, y: -0.2 },
    ])

    expect(note).toMatchObject({ x: 1, y: 0 })
    expect(note?.text).toHaveLength(BOARD_NOTE_MAX_LENGTH)
  })

  it('drops garbage and caps the number of notes', () => {
    expect(toBoardNotes([null, 42, {}, { color: 'nope' }])).toEqual([])
    expect(toBoardNotes('heart')).toEqual([])
    expect(
      toBoardNotes(Array.from({ length: MAX_BOARD_NOTES + 5 }, () => ({ color: 'sage' }))),
    ).toHaveLength(MAX_BOARD_NOTES)
  })
})

describe('board helpers', () => {
  it('places a tap-added note into the first free slot', () => {
    expect(nextFreePosition([])).toEqual({ x: 0.28, y: 0.14 })

    const taken = nextFreePosition([{ id: 'a', color: 'sage', text: '', x: 0.28, y: 0.14 }])
    expect(taken).not.toEqual({ x: 0.28, y: 0.14 })
  })

  it('falls back to the centre when every slot is taken', () => {
    const notes = BOARD_NOTE_SLOTS.map((slot, index) => ({
      id: String(index),
      color: 'sage' as const,
      text: '',
      ...slot,
    }))

    expect(nextFreePosition(notes)).toEqual({ x: 0.58, y: 0.58 })
  })

  it('keeps the whole note inside the board', () => {
    const insetX = (BOARD_NOTE_SIZE / 2 + BOARD_NOTE_MARGIN) / 400
    const insetY = (BOARD_NOTE_SIZE / 2 + BOARD_NOTE_MARGIN) / 500

    expect(clampNotePosition(0, 0, 400, 500)).toEqual({ x: insetX, y: insetY })
    expect(clampNotePosition(1, 1, 400, 500)).toEqual({ x: 1 - insetX, y: 1 - insetY })
  })

  it('shrinks the font as the text grows', () => {
    expect(noteFontSize('коротко')).toBe(14)
    expect(noteFontSize('я'.repeat(60))).toBe(12)
    expect(noteFontSize('я'.repeat(150))).toBe(11)
  })

  it('declines the note count in Russian', () => {
    expect(notesCountLabel(0)).toBe('нет заметок')
    expect(notesCountLabel(1)).toBe('1 заметка')
    expect(notesCountLabel(3)).toBe('3 заметки')
    expect(notesCountLabel(11)).toBe('11 заметок')
    expect(notesCountLabel(21)).toBe('21 заметка')
  })

  it('creates an empty note with a unique id', () => {
    const first = createBoardNote('sky', { x: 0.3, y: 0.4 })
    const second = createBoardNote('sky', { x: 0.3, y: 0.4 })

    expect(first).toMatchObject({ color: 'sky', text: '', x: 0.3, y: 0.4 })
    expect(first.id).not.toBe(second.id)
  })
})
