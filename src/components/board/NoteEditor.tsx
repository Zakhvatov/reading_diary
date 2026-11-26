import { useEffect } from 'react'
import {
  BOARD_NOTE_COLORS,
  BOARD_NOTE_LABELS,
  BOARD_NOTE_MAX_LENGTH,
  type BoardNote,
  type BoardNoteColor,
} from '@/lib/board'
import { BOARD_NOTE_STYLES } from './noteStyles'

type NoteEditorProps = {
  note: BoardNote | null
  onChange: (text: string) => void
  onColor: (color: BoardNoteColor) => void
  onClose: () => void
}

/**
 * Заметка раскрывается на весь экран: поле ввода остаётся над клавиатурой,
 * поэтому писать можно на телефоне без борьбы с нижним листом.
 */
export function NoteEditor({ note, onChange, onColor, onClose }: NoteEditorProps) {
  useEffect(() => {
    if (!note) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [note, onClose])

  if (!note) return null

  const style = BOARD_NOTE_STYLES[note.color]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Заметка"
      className="fixed inset-0 z-50 flex flex-col bg-paper"
    >
      <div className="pad-x flex items-start justify-between gap-4 pt-[calc(var(--safe-top)+16px)]">
        <div className="min-w-0">
          <p className="text-[10px] leading-[14px] font-semibold tracking-[0.14em] text-muted/80 uppercase">
            Дневник
          </p>
          <h2 className="mt-1 font-display text-[30px] leading-[36px] font-medium tracking-[-0.02em]">
            Заметка
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 shrink-0 px-2 text-[14px] leading-[20px] font-medium text-accent"
        >
          Готово
        </button>
      </div>

      <div className="pad-x mt-5">
        <div
          className={[
            'rounded-[var(--radius-card)] border p-3',
            style.surface,
            style.ink,
            style.border,
          ].join(' ')}
        >
          <textarea
            autoFocus
            value={note.text}
            maxLength={BOARD_NOTE_MAX_LENGTH}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Что запомнилось?"
            aria-label={`Текст заметки «${BOARD_NOTE_LABELS[note.color]}»`}
            className="block min-h-[200px] w-full resize-none bg-transparent text-[16px] leading-[24px] outline-none placeholder:opacity-45"
          />
        </div>

        <div className="mt-2 flex items-baseline justify-between gap-3 text-[12px] leading-[16px] text-muted">
          <span>Текст сохраняется сам</span>
          <span>
            {note.text.length} / {BOARD_NOTE_MAX_LENGTH}
          </span>
        </div>

        <p className="mt-5 text-[13px] leading-[18px] font-medium">Цвет бумаги</p>

        <div className="mt-1.5 flex items-center gap-2.5">
          {BOARD_NOTE_COLORS.map((color) => {
            const swatch = BOARD_NOTE_STYLES[color]
            const active = note.color === color

            return (
              <button
                key={color}
                type="button"
                aria-label={`Цвет «${BOARD_NOTE_LABELS[color]}»`}
                aria-pressed={active}
                onClick={() => onColor(color)}
                className={[
                  'size-11 rounded-full border',
                  swatch.surface,
                  swatch.border,
                  active ? 'outline-2 outline-offset-2 outline-accent' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
