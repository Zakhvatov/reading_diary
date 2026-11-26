import { noteFontSize, type BoardNote } from '@/lib/board'
import { BOARD_NOTE_STYLES } from './noteStyles'

type BoardNoteViewProps = {
  note: BoardNote
  className?: string
}

/** Бумажка с текстом. Один и тот же вид на доске, в превью и в палитре. */
export function BoardNoteView({ note, className }: BoardNoteViewProps) {
  const style = BOARD_NOTE_STYLES[note.color]
  const text = note.text.trimEnd()

  return (
    <div
      className={[
        'flex flex-col overflow-hidden rounded-[3px] border px-3 py-2.5',
        style.surface,
        style.ink,
        style.border,
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ fontSize: noteFontSize(note.text) }}
    >
      {text ? (
        <p className="leading-[1.3] break-words whitespace-pre-wrap">{text}</p>
      ) : (
        <span className="text-[11px] leading-[15px] opacity-45">Написать…</span>
      )}
    </div>
  )
}
