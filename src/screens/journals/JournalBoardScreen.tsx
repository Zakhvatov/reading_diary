import { ArrowCounterClockwise, Copy, TextAa, Trash } from '@phosphor-icons/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { BoardCanvas } from '@/components/board/BoardCanvas'
import { BoardPalette } from '@/components/board/BoardPalette'
import { NoteEditor } from '@/components/board/NoteEditor'
import { BOARD_NOTE_STYLES } from '@/components/board/noteStyles'
import { StickerPalette } from '@/components/board/StickerPalette'
import { STICKER_TONE_STYLES } from '@/components/board/stickerStyles'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import type { JournalEntry } from '@/db/types'
import { getJournal, updateJournal } from '@/db/repositories/journals'
import {
  BOARD_NOTE_COLORS,
  BOARD_NOTE_LABELS,
  MAX_BOARD_NOTES,
  clampNotePosition,
  createBoardNote,
  nextFreePosition,
  type BoardNote,
  type BoardNoteColor,
} from '@/lib/board'
import {
  MAX_STICKERS,
  STICKER_TONES,
  STICKER_TONE_LABELS,
  clampStickerPosition,
  createSticker,
  nextFreeStickerPosition,
  rotateStickerRot,
  type Sticker,
  type StickerKind,
  type StickerTone,
} from '@/lib/stickers'

const SAVE_DELAY_MS = 400
const UNDO_TIMEOUT_MS = 5000
const ROTATE_STEP_DEG = -15

type PaletteMode = 'notes' | 'stickers'

export function JournalBoardScreen() {
  const { journalId } = useParams()
  const entry = useLiveQuery(async () => {
    if (!journalId) return null
    return (await getJournal(journalId)) ?? null
  }, [journalId])

  if (entry === undefined) {
    return (
      <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
        <ScreenHeader title="Доска" caption="Дневник" back />
        <p className="mt-6 text-muted">Загрузка…</p>
      </div>
    )
  }

  if (entry === null) {
    return (
      <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
        <ScreenHeader title="Доска" caption="Дневник" back />
        <p className="mt-6 text-muted">Запись не найдена.</p>
        <Button variant="outline" to="/journals" className="mt-4">
          К записям
        </Button>
      </div>
    )
  }

  return <BoardEditor key={entry.id} entry={entry} />
}

function BoardEditor({ entry }: { entry: JournalEntry }) {
  const [draft, setDraft] = useState<BoardNote[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editorId, setEditorId] = useState<string | null>(null)
  const [removed, setRemoved] = useState<{ note: BoardNote; index: number } | null>(null)
  const [mode, setMode] = useState<PaletteMode>('notes')
  const [stickerDraft, setStickerDraft] = useState<Sticker[] | null>(null)
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const notesRef = useRef<BoardNote[] | null>(null)
  const stickersRef = useRef<Sticker[] | null>(null)
  const saveTimer = useRef<number | null>(null)
  const stickerSaveTimer = useRef<number | null>(null)
  const undoTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (saveTimer.current !== null) {
        window.clearTimeout(saveTimer.current)
        if (notesRef.current) void updateJournal(entry.id, { board: notesRef.current })
      }
      if (stickerSaveTimer.current !== null) {
        window.clearTimeout(stickerSaveTimer.current)
        if (stickersRef.current) void updateJournal(entry.id, { stickers: stickersRef.current })
      }
      if (undoTimer.current !== null) window.clearTimeout(undoTimer.current)
    }
  }, [entry.id])

  const notes = draft ?? entry.board
  const selected = notes.find((note) => note.id === selectedId) ?? null
  const editable = notes.find((note) => note.id === editorId) ?? null
  const stickers = stickerDraft ?? entry.stickers
  const boardStickers = stickers.filter((sticker) => sticker.surface === 'board')
  const selectedSticker = stickers.find((sticker) => sticker.id === selectedStickerId) ?? null

  function commit(next: BoardNote[], debounce = false) {
    notesRef.current = next
    setDraft(next)

    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current)

    if (debounce) {
      saveTimer.current = window.setTimeout(() => {
        saveTimer.current = null
        void updateJournal(entry.id, { board: notesRef.current ?? [] })
      }, SAVE_DELAY_MS)
    } else {
      saveTimer.current = null
      void updateJournal(entry.id, { board: next })
    }
  }

  function flush() {
    if (saveTimer.current === null) return

    window.clearTimeout(saveTimer.current)
    saveTimer.current = null
    void updateJournal(entry.id, { board: notesRef.current ?? [] })
  }

  function commitStickers(next: Sticker[], debounce = false) {
    stickersRef.current = next
    setStickerDraft(next)

    if (stickerSaveTimer.current !== null) window.clearTimeout(stickerSaveTimer.current)

    if (debounce) {
      stickerSaveTimer.current = window.setTimeout(() => {
        stickerSaveTimer.current = null
        void updateJournal(entry.id, { stickers: stickersRef.current ?? [] })
      }, SAVE_DELAY_MS)
    } else {
      stickerSaveTimer.current = null
      void updateJournal(entry.id, { stickers: next })
    }
  }

  function addNote(color: BoardNoteColor, position?: { x: number; y: number }) {
    const current = notesRef.current ?? entry.board
    if (current.length >= MAX_BOARD_NOTES) return

    const frame = boardRef.current?.getBoundingClientRect()
    const target = position ?? nextFreePosition(current)
    const inside =
      frame && frame.width > 0 && frame.height > 0
        ? clampNotePosition(target.x, target.y, frame.width, frame.height)
        : target

    const note = createBoardNote(color, inside)
    commit([...current, note])
    setRemoved(null)
    setSelectedId(note.id)
    setEditorId(note.id)
  }

  function dropNote(color: BoardNoteColor, clientX: number, clientY: number) {
    const frame = boardRef.current?.getBoundingClientRect()
    if (!frame) return

    const inside =
      clientX >= frame.left &&
      clientX <= frame.right &&
      clientY >= frame.top &&
      clientY <= frame.bottom
    if (!inside) return

    addNote(
      color,
      clampNotePosition(
        (clientX - frame.left) / frame.width,
        (clientY - frame.top) / frame.height,
        frame.width,
        frame.height,
      ),
    )
  }

  function moveNote(id: string, x: number, y: number) {
    const current = notesRef.current ?? entry.board
    const note = current.find((item) => item.id === id)
    if (!note) return

    // Перетащенная заметка ложится поверх остальных.
    commit([...current.filter((item) => item.id !== id), { ...note, x, y }])
  }

  function changeText(text: string) {
    if (!editorId) return

    const current = notesRef.current ?? entry.board
    commit(
      current.map((note) => (note.id === editorId ? { ...note, text } : note)),
      true,
    )
  }

  function closeEditor() {
    setEditorId(null)
    flush()
  }

  function changeColorOf(id: string, color: BoardNoteColor) {
    if (!id) return

    const current = notesRef.current ?? entry.board
    commit(current.map((note) => (note.id === id ? { ...note, color } : note)))
  }

  function duplicateSelected() {
    if (!selected) return

    const current = notesRef.current ?? entry.board
    if (current.length >= MAX_BOARD_NOTES) return

    const frame = boardRef.current?.getBoundingClientRect()
    const position = frame
      ? clampNotePosition(selected.x + 0.06, selected.y + 0.06, frame.width, frame.height)
      : { x: Math.min(1, selected.x + 0.06), y: Math.min(1, selected.y + 0.06) }

    const copy: BoardNote = { ...selected, id: crypto.randomUUID(), ...position }
    commit([...current, copy])
    setSelectedId(copy.id)
  }

  function deleteSelected() {
    if (!selected) return

    const current = notesRef.current ?? entry.board
    const index = current.findIndex((note) => note.id === selected.id)
    if (index < 0) return

    commit(current.filter((note) => note.id !== selected.id))
    setSelectedId(null)
    setEditorId(null)
    setRemoved({ note: selected, index })

    if (undoTimer.current !== null) window.clearTimeout(undoTimer.current)
    undoTimer.current = window.setTimeout(() => setRemoved(null), UNDO_TIMEOUT_MS)
  }

  function undoRemove() {
    if (!removed) return

    const current = notesRef.current ?? entry.board
    const next = [...current]
    next.splice(Math.min(removed.index, next.length), 0, removed.note)

    commit(next)
    setSelectedId(removed.note.id)
    setRemoved(null)

    if (undoTimer.current !== null) {
      window.clearTimeout(undoTimer.current)
      undoTimer.current = null
    }
  }

  function switchMode(next: PaletteMode) {
    if (next === mode) return

    setMode(next)
    setSelectedId(null)
    setEditorId(null)
    setSelectedStickerId(null)
  }

  function addSticker(kind: StickerKind, position?: { x: number; y: number }) {
    const current = stickersRef.current ?? entry.stickers
    if (current.length >= MAX_STICKERS) return

    const frame = boardRef.current?.getBoundingClientRect()
    const target = position ?? nextFreeStickerPosition(current)
    const inside =
      frame && frame.width > 0 && frame.height > 0
        ? clampStickerPosition(kind, target.x, target.y, frame.width, frame.height)
        : target

    const sticker = createSticker(kind, 'lilac', 'board', inside, current.length)
    commitStickers([...current, sticker])
    setSelectedStickerId(sticker.id)
  }

  function dropSticker(kind: StickerKind, clientX: number, clientY: number) {
    const frame = boardRef.current?.getBoundingClientRect()
    if (!frame) return

    const inside =
      clientX >= frame.left &&
      clientX <= frame.right &&
      clientY >= frame.top &&
      clientY <= frame.bottom
    if (!inside) return

    addSticker(
      kind,
      clampStickerPosition(
        kind,
        (clientX - frame.left) / frame.width,
        (clientY - frame.top) / frame.height,
        frame.width,
        frame.height,
      ),
    )
  }

  function moveSticker(id: string, x: number, y: number) {
    const current = stickersRef.current ?? entry.stickers
    const sticker = current.find((item) => item.id === id)
    if (!sticker) return

    // Перетащенный стикер ложится поверх остальных.
    commitStickers([...current.filter((item) => item.id !== id), { ...sticker, x, y }])
  }

  function changeToneOf(id: string, tone: StickerTone) {
    if (!id) return

    const current = stickersRef.current ?? entry.stickers
    commitStickers(current.map((item) => (item.id === id ? { ...item, tone } : item)))
  }

  function rotateSelectedSticker() {
    if (!selectedSticker) return

    const current = stickersRef.current ?? entry.stickers
    commitStickers(
      current.map((item) =>
        item.id === selectedSticker.id
          ? { ...item, rot: rotateStickerRot(item.rot, ROTATE_STEP_DEG) }
          : item,
      ),
    )
  }

  function duplicateSelectedSticker() {
    if (!selectedSticker) return

    const current = stickersRef.current ?? entry.stickers
    if (current.length >= MAX_STICKERS) return

    const frame = boardRef.current?.getBoundingClientRect()
    const position = frame
      ? clampStickerPosition(
          selectedSticker.kind,
          selectedSticker.x + 0.06,
          selectedSticker.y + 0.06,
          frame.width,
          frame.height,
        )
      : { x: Math.min(1, selectedSticker.x + 0.06), y: Math.min(1, selectedSticker.y + 0.06) }

    const copy: Sticker = { ...selectedSticker, id: crypto.randomUUID(), ...position }
    commitStickers([...current, copy])
    setSelectedStickerId(copy.id)
  }

  function deleteSelectedSticker() {
    if (!selectedSticker) return

    commitStickers(
      (stickersRef.current ?? entry.stickers).filter((item) => item.id !== selectedSticker.id),
    )
    setSelectedStickerId(null)
  }

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-paper">
      <div className="pad-x pt-[calc(var(--safe-top)+16px)]">
        <ScreenHeader
          title="Доска"
          caption="Дневник"
          back
          action={
            (selected || selectedSticker) && !editorId ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedId(null)
                  setSelectedStickerId(null)
                }}
                className="min-h-11 px-2 text-[14px] leading-[20px] font-medium text-accent"
              >
                Готово
              </button>
            ) : undefined
          }
        />
      </div>

      <div ref={boardRef} className="relative mx-5 mt-4 min-h-0 flex-1">
        <div className="absolute inset-0 overflow-hidden rounded-[var(--radius-card)] border border-line bg-board">
          <BoardCanvas
            notes={notes}
            stickers={boardStickers}
            selectedId={selectedId}
            stickerSelectedId={selectedStickerId}
            onSelect={setSelectedId}
            onSelectSticker={setSelectedStickerId}
            onMove={moveNote}
            onMoveSticker={moveSticker}
            onEdit={setEditorId}
          />
        </div>
      </div>

      <div className="pad-x mt-3 pb-[calc(var(--safe-bottom)+16px)]">
        {removed && mode === 'notes' ? (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-line bg-surface px-3 py-1.5">
            <p className="text-[13px] leading-[18px] text-muted">Заметка удалена</p>
            <button
              type="button"
              onClick={undoRemove}
              className="min-h-11 px-2 text-[13px] leading-[18px] font-medium text-accent"
            >
              Вернуть
            </button>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] leading-[18px] font-medium text-muted">Оформление</p>
          <div className="flex items-center rounded-[var(--radius-pill)] border border-line bg-surface p-0.5">
            <button
              type="button"
              onClick={() => switchMode('notes')}
              aria-pressed={mode === 'notes'}
              className={[
                'flex h-8 items-center rounded-[var(--radius-pill)] px-3 text-[13px] font-medium',
                mode === 'notes' ? 'bg-accent text-accent-ink' : 'text-muted',
              ].join(' ')}
            >
              Заметки
            </button>
            <button
              type="button"
              onClick={() => switchMode('stickers')}
              aria-pressed={mode === 'stickers'}
              className={[
                'flex h-8 items-center rounded-[var(--radius-pill)] px-3 text-[13px] font-medium',
                mode === 'stickers' ? 'bg-accent text-accent-ink' : 'text-muted',
              ].join(' ')}
            >
              Стикеры
            </button>
          </div>
        </div>

        {mode === 'stickers' ? (
          selectedSticker ? (
            <div className="mt-3">
              <p className="text-[13px] leading-[18px] font-medium">Цвет стикера</p>

              <div className="mt-1.5 flex items-center gap-2.5">
                {STICKER_TONES.map((tone) => {
                  const style = STICKER_TONE_STYLES[tone]
                  const active = selectedSticker.tone === tone

                  return (
                    <button
                      key={tone}
                      type="button"
                      aria-label={`Тон «${STICKER_TONE_LABELS[tone]}»`}
                      aria-pressed={active}
                      onClick={() => changeToneOf(selectedSticker.id, tone)}
                      className={[
                        'size-11 rounded-full border',
                        style.surface,
                        style.border,
                        active ? 'outline-2 outline-offset-2 outline-accent' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    />
                  )
                })}
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={rotateSelectedSticker}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-pill)] border border-line bg-surface px-2 text-[13px] font-medium active:scale-[0.98]"
                >
                  <ArrowCounterClockwise size={17} aria-hidden />
                  Повернуть
                </button>
                <button
                  type="button"
                  onClick={duplicateSelectedSticker}
                  disabled={stickers.length >= MAX_STICKERS}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-pill)] border border-line bg-surface px-2 text-[13px] font-medium active:scale-[0.98] disabled:opacity-50"
                >
                  <Copy size={17} aria-hidden />
                  Копия
                </button>
                <button
                  type="button"
                  onClick={deleteSelectedSticker}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-pill)] border border-line bg-surface px-2 text-[13px] font-medium text-signal active:scale-[0.98]"
                >
                  <Trash size={17} aria-hidden />
                  Удалить
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <StickerPalette count={stickers.length} onAdd={addSticker} onDrop={dropSticker} />
            </div>
          )
        ) : selected ? (
          <div className="mt-3">
            <p className="text-[13px] leading-[18px] font-medium">Цвет бумаги</p>

            <div className="mt-1.5 flex items-center gap-2.5">
              {BOARD_NOTE_COLORS.map((color) => {
                const style = BOARD_NOTE_STYLES[color]
                const active = selected.color === color

                return (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Цвет «${BOARD_NOTE_LABELS[color]}»`}
                    aria-pressed={active}
                    onClick={() => changeColorOf(selected.id, color)}
                    className={[
                      'size-11 rounded-full border',
                      style.surface,
                      style.border,
                      active ? 'outline-2 outline-offset-2 outline-accent' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  />
                )
              })}
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setEditorId(selected.id)}
                className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-pill)] border border-line bg-surface px-2 text-[13px] font-medium active:scale-[0.98]"
              >
                <TextAa size={17} aria-hidden />
                Текст
              </button>
              <button
                type="button"
                onClick={duplicateSelected}
                disabled={notes.length >= MAX_BOARD_NOTES}
                className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-pill)] border border-line bg-surface px-2 text-[13px] font-medium active:scale-[0.98] disabled:opacity-50"
              >
                <Copy size={17} aria-hidden />
                Копия
              </button>
              <button
                type="button"
                onClick={deleteSelected}
                className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-pill)] border border-line bg-surface px-2 text-[13px] font-medium text-signal active:scale-[0.98]"
              >
                <Trash size={17} aria-hidden />
                Удалить
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <BoardPalette count={notes.length} onAdd={addNote} onDrop={dropNote} />
          </div>
        )}
      </div>

      <NoteEditor
        note={editable}
        onChange={changeText}
        onColor={(color) => changeColorOf(editable?.id ?? '', color)}
        onClose={closeEditor}
      />
    </div>
  )
}
