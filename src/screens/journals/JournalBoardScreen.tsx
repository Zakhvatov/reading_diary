import { Copy, TextAa, Trash } from '@phosphor-icons/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { BoardCanvas } from '@/components/board/BoardCanvas'
import { BoardPalette } from '@/components/board/BoardPalette'
import { NoteEditor } from '@/components/board/NoteEditor'
import { BOARD_NOTE_STYLES } from '@/components/board/noteStyles'
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

const SAVE_DELAY_MS = 400
const UNDO_TIMEOUT_MS = 5000

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
  const boardRef = useRef<HTMLDivElement>(null)
  const notesRef = useRef<BoardNote[] | null>(null)
  const saveTimer = useRef<number | null>(null)
  const undoTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (saveTimer.current !== null) {
        window.clearTimeout(saveTimer.current)
        if (notesRef.current) void updateJournal(entry.id, { board: notesRef.current })
      }
      if (undoTimer.current !== null) window.clearTimeout(undoTimer.current)
    }
  }, [entry.id])

  const notes = draft ?? entry.board
  const selected = notes.find((note) => note.id === selectedId) ?? null
  const editable = notes.find((note) => note.id === editorId) ?? null

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

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-paper">
      <div className="pad-x pt-[calc(var(--safe-top)+16px)]">
        <ScreenHeader
          title="Доска"
          caption="Дневник"
          back
          action={
            selected && !editorId ? (
              <button
                type="button"
                onClick={() => setSelectedId(null)}
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
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMove={moveNote}
            onEdit={setEditorId}
          />
        </div>
      </div>

      <div className="pad-x mt-3 pb-[calc(var(--safe-bottom)+16px)]">
        {removed ? (
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

        {selected ? (
          <div>
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
          <BoardPalette count={notes.length} onAdd={addNote} onDrop={dropNote} />
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
