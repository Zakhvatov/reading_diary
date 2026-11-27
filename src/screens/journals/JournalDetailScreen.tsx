import {
  BookOpen,
  PencilSimple,
  SquaresFour,
  Sticker as StickerIcon,
} from '@phosphor-icons/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BoardPreview } from '@/components/board/BoardPreview'
import { StickerLayer } from '@/components/board/StickerLayer'
import { StickerPalette } from '@/components/board/StickerPalette'
import { STICKER_TONE_STYLES } from '@/components/board/stickerStyles'
import { JOURNAL_COLOR_STYLES } from '@/components/journal/colors'
import { JournalPhoto } from '@/components/journal/JournalPhoto'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { Sheet } from '@/components/ui/Sheet'
import { useBook } from '@/db/live'
import { deleteJournal, getJournal, updateJournal } from '@/db/repositories/journals'
import { notesCountLabel } from '@/lib/board'
import { formatDay } from '@/lib/dates'
import { renderMarkdown } from '@/lib/markdown'
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

const ROTATE_STEP_DEG = -15

export function JournalDetailScreen() {
  const { journalId } = useParams()
  const entry = useLiveQuery(async () => {
    if (!journalId) return null
    return (await getJournal(journalId)) ?? null
  }, [journalId])
  const book = useBook(entry?.bookId)
  const navigate = useNavigate()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [decorating, setDecorating] = useState(false)
  const [stickerDraft, setStickerDraft] = useState<Sticker[] | null>(null)
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const stickersRef = useRef<Sticker[] | null>(null)
  const saveTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (saveTimer.current !== null) {
        window.clearTimeout(saveTimer.current)
        if (journalId && stickersRef.current) {
          void updateJournal(journalId, { stickers: stickersRef.current })
        }
      }
    }
  }, [journalId])

  if (entry === undefined) {
    return (
      <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
        <ScreenHeader title="Запись" caption="Дневник" back />
        <p className="mt-6 text-muted">Загрузка…</p>
      </div>
    )
  }

  if (entry === null) {
    return (
      <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
        <ScreenHeader title="Запись" caption="Дневник" back />
        <p className="mt-6 text-muted">Запись не найдена.</p>
        <Button variant="outline" to="/journals" className="mt-4">
          К записям
        </Button>
      </div>
    )
  }

  const tone = JOURNAL_COLOR_STYLES[entry.color]
  // Сужение типа не переживает замыкания, поэтому фиксируем запись один раз.
  const item = entry

  const stickers = stickerDraft ?? item.stickers
  const pageStickers = stickers.filter((sticker) => sticker.surface === 'page')
  const boardStickers = stickers.filter((sticker) => sticker.surface === 'board')
  const selectedSticker = pageStickers.find((sticker) => sticker.id === selectedStickerId) ?? null

  function commitStickers(next: Sticker[], debounce = false) {
    stickersRef.current = next
    setStickerDraft(next)

    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current)

    if (debounce) {
      saveTimer.current = window.setTimeout(() => {
        saveTimer.current = null
        if (journalId) void updateJournal(journalId, { stickers: stickersRef.current ?? [] })
      }, 400)
    } else {
      saveTimer.current = null
      if (journalId) void updateJournal(journalId, { stickers: next })
    }
  }

  function flushStickers() {
    if (saveTimer.current === null) return

    window.clearTimeout(saveTimer.current)
    saveTimer.current = null
    if (journalId) void updateJournal(journalId, { stickers: stickersRef.current ?? [] })
  }

  function startDecorating() {
    setDecorating(true)
    setSelectedStickerId(null)
  }

  function finishDecorating() {
    flushStickers()
    setDecorating(false)
    setSelectedStickerId(null)
  }

  function deselectOnEmpty(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) setSelectedStickerId(null)
  }

  function addPageSticker(kind: StickerKind, position?: { x: number; y: number }) {
    const current = stickersRef.current ?? item.stickers
    if (current.length >= MAX_STICKERS) return

    const frame = contentRef.current?.getBoundingClientRect()
    const target = position ?? nextFreeStickerPosition(current)
    const inside =
      frame && frame.width > 0 && frame.height > 0
        ? clampStickerPosition(kind, target.x, target.y, frame.width, frame.height)
        : target

    const sticker = createSticker(kind, 'lilac', 'page', inside, current.length)
    commitStickers([...current, sticker])
    setSelectedStickerId(sticker.id)
  }

  function dropPageSticker(kind: StickerKind, clientX: number, clientY: number) {
    const frame = contentRef.current?.getBoundingClientRect()
    if (!frame) return

    const inside =
      clientX >= frame.left &&
      clientX <= frame.right &&
      clientY >= frame.top &&
      clientY <= frame.bottom
    if (!inside) return

    addPageSticker(
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

  function movePageSticker(id: string, x: number, y: number) {
    const current = stickersRef.current ?? item.stickers
    const sticker = current.find((item) => item.id === id)
    if (!sticker) return

    // Перетащенный стикер ложится поверх остальных.
    commitStickers([...current.filter((item) => item.id !== id), { ...sticker, x, y }])
  }

  function changeToneOf(id: string, tone: StickerTone) {
    if (!id) return

    const current = stickersRef.current ?? item.stickers
    commitStickers(current.map((item) => (item.id === id ? { ...item, tone } : item)))
  }

  function rotateSelectedSticker() {
    if (!selectedSticker) return

    const current = stickersRef.current ?? item.stickers
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

    const current = stickersRef.current ?? item.stickers
    if (current.length >= MAX_STICKERS) return

    const frame = contentRef.current?.getBoundingClientRect()
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
      (stickersRef.current ?? item.stickers).filter((item) => item.id !== selectedSticker.id),
    )
    setSelectedStickerId(null)
  }

  async function remove() {
    setBusy(true)
    setError(null)

    try {
      await deleteJournal(item.id)
      navigate('/journals', { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось удалить запись')
      setBusy(false)
    }
  }

  return (
    <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
      <ScreenHeader
        title="Запись"
        caption="Дневник"
        back
        action={
          decorating ? (
            <button
              type="button"
              onClick={finishDecorating}
              className="min-h-11 px-2 text-[14px] leading-[20px] font-medium text-accent"
            >
              Готово
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Украсить запись"
                onClick={startDecorating}
                className="flex size-11 items-center justify-center rounded-full text-ink active:bg-accent-soft"
              >
                <StickerIcon size={20} aria-hidden />
              </button>
              <Link
                to={`/journals/${item.id}/board`}
                aria-label="Доска заметок"
                className="flex size-11 items-center justify-center rounded-full text-ink active:bg-accent-soft"
              >
                <SquaresFour size={20} aria-hidden />
              </Link>
            </div>
          )
        }
      />

      <div
        ref={contentRef}
        onClick={decorating ? deselectOnEmpty : undefined}
        className={`relative mt-5 ${decorating ? 'pb-[calc(var(--safe-bottom)+280px)]' : ''}`}
      >
        {item.photoIds.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {item.photoIds.map((photoId, index) => (
              <JournalPhoto
                key={photoId}
                photoId={photoId}
                alt={`Фото ${index + 1} к записи «${item.title || 'Без названия'}»`}
                className={
                  index === 0
                    ? 'col-span-2 h-48 w-full rounded-[var(--radius-card)] border border-line object-cover'
                    : 'aspect-square w-full rounded-[var(--radius-card)] border border-line object-cover'
                }
              />
            ))}
          </div>
        ) : null}

        <article
          className={`relative mt-5 overflow-hidden rounded-[var(--radius-card)] p-5 pl-6 ${tone.surface} ${tone.ink}`}
        >
          <span aria-hidden className={`absolute inset-y-0 left-0 w-1.5 ${tone.stripe}`} />
          <time
            dateTime={item.entryDate}
            className="block text-[11px] leading-[14px] font-medium tracking-[0.08em] uppercase opacity-70"
          >
            {formatDay(item.entryDate)}
          </time>
          <h2 className="mt-1 font-display text-[26px] leading-[32px] font-medium">
            {item.title || 'Без названия'}
          </h2>
          {book ? (
            <Link
              to={`/books/${book.id}`}
              className="mt-2 inline-flex max-w-full items-center gap-1.5 text-[13px] leading-[18px] underline underline-offset-2 opacity-80"
            >
              <BookOpen size={15} aria-hidden className="shrink-0" />
              <span className="truncate">{book.title}</span>
            </Link>
          ) : null}
        </article>

        {item.body.trim() ? <div className="mt-6">{renderMarkdown(item.body)}</div> : null}

        <Link
          to={`/journals/${item.id}/board`}
          className="mt-7 block rounded-[var(--radius-card)] border border-line bg-surface p-4 active:bg-accent-soft/30"
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-display text-[18px] leading-[24px] font-medium">Доска</p>
            <span className="text-[12px] leading-[16px] text-muted">
              {notesCountLabel(item.board.length)}
            </span>
          </div>
          <BoardPreview notes={item.board} stickers={boardStickers} />
          <p className="mt-2 text-[12px] leading-[16px] text-muted">Открыть доску</p>
        </Link>

        {error ? (
          <p role="alert" className="mt-4 text-[14px] leading-[20px] text-signal">
            {error}
          </p>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6">
          <Button variant="outline" to={`/journals/${item.id}/edit`}>
            <PencilSimple size={18} aria-hidden />
            Редактировать
          </Button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="min-h-11 text-[14px] leading-[20px] text-signal"
          >
            Удалить запись
          </button>
        </div>

        <div className="pointer-events-none absolute inset-0 z-30">
          <StickerLayer
            stickers={pageStickers}
            editable={decorating}
            selectedId={selectedStickerId}
            onSelect={setSelectedStickerId}
            onMove={movePageSticker}
          />
        </div>
      </div>

      {decorating ? (
        <div className="fixed inset-x-4 bottom-[calc(var(--tab-h)+var(--safe-bottom)+16px)] z-30 rounded-[var(--radius-card)] border border-line bg-surface p-4">
          {selectedSticker ? (
            <div>
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
                  Повернуть
                </button>
                <button
                  type="button"
                  onClick={duplicateSelectedSticker}
                  disabled={stickers.length >= MAX_STICKERS}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-pill)] border border-line bg-surface px-2 text-[13px] font-medium active:scale-[0.98] disabled:opacity-50"
                >
                  Копия
                </button>
                <button
                  type="button"
                  onClick={deleteSelectedSticker}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-pill)] border border-line bg-surface px-2 text-[13px] font-medium text-signal active:scale-[0.98]"
                >
                  Удалить
                </button>
              </div>
            </div>
          ) : (
            <StickerPalette
              count={stickers.length}
              surface="page"
              onAdd={addPageSticker}
              onDrop={dropPageSticker}
            />
          )}
        </div>
      ) : null}

      <Sheet open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Удалить запись?">
        <p className="text-[15px] leading-[23px] text-muted">
          Запись, фото и заметки на доске удалятся без возможности отменить.
        </p>
        <div className="mt-5 flex flex-col gap-3">
          <Button variant="danger" onClick={remove} disabled={busy}>
            {busy ? 'Удаляем…' : 'Удалить'}
          </Button>
          <Button variant="outline" onClick={() => setDeleteOpen(false)}>
            Отмена
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
