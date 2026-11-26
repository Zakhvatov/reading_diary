import { BookOpen, PencilSimple, Sticker as StickerIcon } from '@phosphor-icons/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { JOURNAL_COLOR_STYLES } from '@/components/journal/colors'
import { JournalPhoto } from '@/components/journal/JournalPhoto'
import { StickerCanvas } from '@/components/journal/StickerCanvas'
import { StickerPicker } from '@/components/journal/StickerPicker'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { Sheet } from '@/components/ui/Sheet'
import { useBook } from '@/db/live'
import { deleteJournal, getJournal, updateJournal } from '@/db/repositories/journals'
import { formatDay } from '@/lib/dates'
import { MAX_JOURNAL_STICKERS } from '@/lib/journal'
import { renderMarkdown } from '@/lib/markdown'
import { createStickerPlacement } from '@/lib/stickerLayout'
import type { StickerId, StickerPlacement } from '@/lib/stickers'

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
  const [layout, setLayout] = useState(false)
  const [placements, setPlacements] = useState<StickerPlacement[] | null>(null)
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const placementsRef = useRef<StickerPlacement[] | null>(null)

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
  const stickers = placements ?? item.stickers

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

  function startLayout() {
    placementsRef.current = item.stickers
    setPlacements(item.stickers)
    setSelectedSticker(null)
    setLayout(true)
  }

  function finishLayout() {
    placementsRef.current = null
    setLayout(false)
    setPlacements(null)
    setSelectedSticker(null)
    setPickerOpen(false)
  }

  function persistStickers(next: StickerPlacement[]) {
    placementsRef.current = next
    setPlacements(next)
    void updateJournal(item.id, { stickers: next })
  }

  function currentStickers(): StickerPlacement[] {
    return placementsRef.current ?? item.stickers
  }

  function moveSticker(id: string, x: number, y: number) {
    persistStickers(
      currentStickers().map((sticker) => (sticker.id === id ? { ...sticker, x, y } : sticker)),
    )
  }

  function addSticker(sticker: StickerId) {
    const current = currentStickers()
    if (current.length >= MAX_JOURNAL_STICKERS) return
    persistStickers([...current, createStickerPlacement(sticker, current.length)])
  }

  function removeSelected() {
    if (!selectedSticker) return
    persistStickers(currentStickers().filter((sticker) => sticker.id !== selectedSticker))
    setSelectedSticker(null)
  }

  return (
    <div className={`pad-x pt-[calc(var(--safe-top)+20px)] ${layout ? 'pb-24' : ''}`}>
      <ScreenHeader
        title="Запись"
        caption="Дневник"
        back
        action={
          layout ? (
            <button
              type="button"
              onClick={finishLayout}
              className="min-h-11 px-2 text-[14px] leading-[20px] font-medium text-accent"
            >
              Готово
            </button>
          ) : (
            <button
              type="button"
              onClick={startLayout}
              aria-label="Стикеры на странице"
              className="flex size-11 items-center justify-center rounded-full text-ink active:bg-accent-soft"
            >
              <StickerIcon size={20} aria-hidden />
            </button>
          )
        }
      />

      {layout ? (
        <div className="mt-4 rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3">
          <p className="text-[13px] leading-[18px]">
            Тащите стикеры пальцем. Нажмите на наклейку, чтобы выбрать её, и «Убрать», чтобы снять.
          </p>
        </div>
      ) : null}

      <div className="relative mt-5">
        {entry.photoIds.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {entry.photoIds.map((photoId, index) => (
              <JournalPhoto
                key={photoId}
                photoId={photoId}
                alt={`Фото ${index + 1} к записи «${entry.title || 'Без названия'}»`}
                className={
                  index === 0
                    ? 'col-span-2 h-48 w-full rounded-[var(--radius-card)] border border-line object-cover'
                    : 'aspect-square w-full rounded-[var(--radius-card)] border border-line object-cover'
                }
              />
            ))}
          </div>
        ) : null}

        <div className={entry.photoIds.length > 0 ? 'relative mt-5' : 'relative'}>
          <article
            className={`relative overflow-hidden rounded-[var(--radius-card)] p-5 pl-6 ${tone.surface} ${tone.ink}`}
          >
            <span aria-hidden className={`absolute inset-y-0 left-0 w-1.5 ${tone.stripe}`} />
            <time
              dateTime={entry.entryDate}
              className="block text-[11px] leading-[14px] font-medium tracking-[0.08em] uppercase opacity-70"
            >
              {formatDay(entry.entryDate)}
            </time>
            <h2 className="mt-1 font-display text-[26px] leading-[32px] font-medium">
              {entry.title || 'Без названия'}
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
        </div>

        {entry.body.trim() ? <div className="mt-6">{renderMarkdown(entry.body)}</div> : null}

        <StickerCanvas
          stickers={stickers}
          editable={layout}
          selectedId={selectedSticker}
          onSelect={setSelectedSticker}
          onMove={moveSticker}
        />
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-[14px] leading-[20px] text-signal">
          {error}
        </p>
      ) : null}

      {layout ? (
        <>
          <div className="fixed inset-x-0 bottom-[calc(var(--tab-h)+var(--safe-bottom)+10px)] z-40 mx-auto flex max-w-lg gap-2 px-5">
            <Button
              variant="outline"
              className="flex-1 px-0"
              onClick={() => setPickerOpen(true)}
              disabled={stickers.length >= MAX_JOURNAL_STICKERS}
            >
              Добавить
            </Button>
            <Button
              variant="outline"
              className="flex-1 px-0"
              onClick={removeSelected}
              disabled={!selectedSticker}
            >
              Убрать
            </Button>
            <Button className="flex-1 px-0" onClick={finishLayout}>
              Готово
            </Button>
          </div>

          <StickerPicker
            open={pickerOpen}
            count={stickers.length}
            onAdd={addSticker}
            onClose={() => setPickerOpen(false)}
          />
        </>
      ) : (
        <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6">
          <Button variant="outline" to={`/journals/${entry.id}/edit`}>
            <PencilSimple size={18} aria-hidden />
            Редактировать
          </Button>
          <Button variant="outline" onClick={startLayout}>
            <StickerIcon size={18} aria-hidden />
            Стикеры на странице
          </Button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="min-h-11 text-[14px] leading-[20px] text-signal"
          >
            Удалить запись
          </button>
        </div>
      )}

      <Sheet open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Удалить запись?">
        <p className="text-[15px] leading-[23px] text-muted">
          Запись, фото и стикеры удалятся без возможности отменить.
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
