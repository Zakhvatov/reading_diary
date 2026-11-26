import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BookForm, type BookFormValues } from '@/components/book/BookForm'
import { BookSearchPanel } from '@/components/book/BookSearchPanel'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { createBook, findSimilarBook, updateBook } from '@/db/repositories/books'
import { saveCover } from '@/db/repositories/covers'
import { useSettings } from '@/db/live'
import { METADATA_SOURCE_LABELS, type BookDraft } from '@/db/metadata/types'
import type { Book } from '@/db/types'
import { fetchRemoteCover } from '@/lib/remoteCover'
import { fileToCover } from '@/lib/image'
import { normalizeIsbn } from '@/lib/isbn'

type Duplicate = {
  book: Book
  values: BookFormValues
  cover: File | null
}

function draftValues(draft: BookDraft): Partial<BookFormValues> {
  return {
    title: draft.title,
    authors: draft.authors,
    genres: draft.genres,
    pageCount: draft.pageCount,
    publishedYear: draft.publishedYear,
    publisher: draft.publisher,
    isbn13: draft.isbn13,
    description: draft.description,
    language: draft.language,
  }
}

export function AddBookScreen() {
  const navigate = useNavigate()
  const settings = useSettings()
  const [searchParams, setSearchParams] = useSearchParams()
  const [draft, setDraft] = useState<BookDraft | null>(null)
  const [manualPrefill, setManualPrefill] = useState<Partial<BookFormValues>>({})
  const [duplicate, setDuplicate] = useState<Duplicate | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tab = searchParams.get('tab') === 'search' ? 'search' : 'manual'
  const isbnParam = searchParams.get('isbn') ?? ''

  async function persist(values: BookFormValues, coverFile: File | null) {
    setBusy(true)
    setError(null)

    try {
      const book = await createBook({
        title: values.title,
        authors: values.authors,
        genres: values.genres,
        pageCount: values.pageCount,
        publishedYear: values.publishedYear,
        publisher: values.publisher,
        isbn13: values.isbn13,
        isbn10: values.isbn10,
        description: values.description,
        language: values.language,
        status: values.status,
        metadataSource: draft?.source ?? 'manual',
      })

      if (coverFile) {
        const image = await fileToCover(coverFile)
        const cover = await saveCover({
          ownerType: 'book',
          ownerId: book.id,
          blob: image.blob,
          width: image.width,
          height: image.height,
        })
        await updateBook(book.id, { coverId: cover.id })
      } else if (draft?.coverUrl) {
        const image = await fetchRemoteCover(draft.coverUrl)
        if (image) {
          const cover = await saveCover({
            ownerType: 'book',
            ownerId: book.id,
            blob: image.blob,
            width: image.width,
            height: image.height,
            sourceUrl: draft.coverUrl,
          })
          await updateBook(book.id, { coverId: cover.id })
        }
      }

      navigate(`/books/${book.id}`, { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось сохранить книгу')
      setBusy(false)
    }
  }

  async function handleSubmit(values: BookFormValues, coverFile: File | null) {
    setError(null)
    const existing = await findSimilarBook({
      isbn13: values.isbn13,
      title: values.title,
      authors: values.authors,
    })

    if (existing) {
      setDuplicate({ book: existing, values, cover: coverFile })
      return
    }

    await persist(values, coverFile)
  }

  function changeTab(next: 'manual' | 'search') {
    setDuplicate(null)
    setDraft(null)
    setManualPrefill({})
    setSearchParams(next === 'search' ? { tab: 'search' } : {}, { replace: true })
  }

  function selectDraft(next: BookDraft) {
    setDuplicate(null)
    setDraft(next)
    window.scrollTo(0, 0)
  }

  function startManual(text: string) {
    const normalized = normalizeIsbn(text)
    setManualPrefill(
      normalized ? { isbn13: normalized.isbn13, isbn10: normalized.isbn10 } : { title: text },
    )
    setDraft(null)
    setSearchParams({}, { replace: true })
  }

  const duplicateNotice = duplicate ? (
    <section className="mt-4 rounded-[var(--radius-card)] border border-signal/40 bg-signal-soft p-4">
      <p className="font-display text-[18px] leading-[24px] font-medium">Похоже, книга уже есть</p>
      <p className="mt-1 text-[14px] leading-[20px]">«{duplicate.book.title}» уже в библиотеке.</p>
      <div className="mt-3 flex flex-col gap-2">
        <Button to={`/books/${duplicate.book.id}`} variant="outline">
          Открыть книгу
        </Button>
        <Button onClick={() => persist(duplicate.values, duplicate.cover)} disabled={busy}>
          Добавить всё равно
        </Button>
      </div>
    </section>
  ) : null

  return (
    <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
      <ScreenHeader title="Новая книга" caption="Библиотека" back />

      <div className="mt-5 grid grid-cols-3 gap-1 rounded-[var(--radius-control)] border border-line bg-surface p-1">
        <button
          type="button"
          onClick={() => changeTab('manual')}
          className={[
            'flex h-10 items-center justify-center rounded-[10px] text-[14px] font-medium',
            tab === 'manual' ? 'bg-accent text-accent-ink' : 'text-muted',
          ].join(' ')}
        >
          Вручную
        </button>
        <button
          type="button"
          onClick={() => changeTab('search')}
          className={[
            'flex h-10 items-center justify-center rounded-[10px] text-[14px] font-medium',
            tab === 'search' ? 'bg-accent text-accent-ink' : 'text-muted',
          ].join(' ')}
        >
          Поиск
        </button>
        <Link
          to="/scan"
          className="flex h-10 items-center justify-center rounded-[10px] text-[14px] font-medium text-muted"
        >
          Сканер
        </Link>
      </div>

      {duplicateNotice}

      {tab === 'manual' ? (
        <BookForm
          key={`manual:${manualPrefill.title ?? ''}:${manualPrefill.isbn13 ?? ''}`}
          submitLabel="Сохранить книгу"
          initialValues={manualPrefill}
          defaultStatus={settings?.defaultStatus}
          busy={busy}
          error={error}
          onSubmit={handleSubmit}
        />
      ) : draft ? (
        <>
          <section className="mt-4 rounded-[var(--radius-card)] border border-line bg-surface p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              Выбрано · {METADATA_SOURCE_LABELS[draft.source]}
            </p>
            <p className="mt-1 font-display text-[18px] leading-[24px] font-medium">
              {draft.title}
            </p>
            <button
              type="button"
              onClick={() => {
                setDraft(null)
                setSearchParams({ tab: 'search' }, { replace: true })
              }}
              className="mt-2 text-[13px] leading-[18px] text-accent"
            >
              Выбрать другую
            </button>
          </section>
          <BookForm
            key={`draft:${draft.sourceId}`}
            submitLabel="Сохранить книгу"
            initialValues={draftValues(draft)}
            coverPreviewUrl={draft.coverUrl}
            defaultStatus={settings?.defaultStatus}
            busy={busy}
            error={error}
            onSubmit={handleSubmit}
          />
        </>
      ) : (
        <BookSearchPanel initialIsbn={isbnParam} onSelect={selectDraft} onManual={startManual} />
      )}
    </div>
  )
}
