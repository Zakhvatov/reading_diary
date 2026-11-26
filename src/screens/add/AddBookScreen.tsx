import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookForm, type BookFormValues } from '@/components/book/BookForm'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { createBook, findSimilarBook, updateBook } from '@/db/repositories/books'
import { saveCover } from '@/db/repositories/covers'
import { useSettings } from '@/db/live'
import type { Book } from '@/db/types'
import { fileToCover } from '@/lib/image'

type Duplicate = {
  book: Book
  values: BookFormValues
  cover: File | null
}

export function AddBookScreen() {
  const navigate = useNavigate()
  const settings = useSettings()
  const [duplicate, setDuplicate] = useState<Duplicate | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        status: values.status,
        metadataSource: 'manual',
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

  return (
    <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
      <ScreenHeader title="Новая книга" caption="Библиотека" back />

      {duplicate ? (
        <section className="mt-4 rounded-[var(--radius-card)] border border-signal/40 bg-signal-soft p-4">
          <p className="font-display text-[18px] leading-[24px] font-medium">
            Похоже, книга уже есть
          </p>
          <p className="mt-1 text-[14px] leading-[20px]">
            «{duplicate.book.title}» уже в библиотеке.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Button to={`/books/${duplicate.book.id}`} variant="outline">
              Открыть книгу
            </Button>
            <Button onClick={() => persist(duplicate.values, duplicate.cover)} disabled={busy}>
              Добавить всё равно
            </Button>
          </div>
        </section>
      ) : null}

      <BookForm
        submitLabel="Сохранить книгу"
        defaultStatus={settings?.defaultStatus}
        busy={busy}
        error={error}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
