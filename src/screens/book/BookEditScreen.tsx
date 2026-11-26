import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BookForm, type BookFormValues } from '@/components/book/BookForm'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { updateBook } from '@/db/repositories/books'
import { deleteCover, saveCover } from '@/db/repositories/covers'
import { useBook } from '@/db/live'
import { fileToCover } from '@/lib/image'

export function BookEditScreen() {
  const { bookId } = useParams()
  const book = useBook(bookId)
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!book) {
    return (
      <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
        <ScreenHeader title="Редактирование" caption="Книга" back />
        <p className="mt-6 text-muted">Загрузка…</p>
      </div>
    )
  }

  async function handleSubmit(values: BookFormValues, coverFile: File | null) {
    if (!book) return

    setBusy(true)
    setError(null)

    try {
      await updateBook(book.id, {
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

        if (book.coverId) {
          await deleteCover(book.coverId)
        }
      }

      navigate(`/books/${book.id}`, { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось сохранить изменения')
      setBusy(false)
    }
  }

  return (
    <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
      <ScreenHeader title="Редактирование" caption="Книга" back />
      <BookForm
        initial={book}
        submitLabel="Сохранить изменения"
        busy={busy}
        error={error}
        onSubmit={handleSubmit}
        onCancel={() => navigate(-1)}
      />
    </div>
  )
}
