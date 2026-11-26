import { CaretDown, Check } from '@phosphor-icons/react'
import { useState } from 'react'
import { BookCover } from '@/components/book/BookCover'
import type { Book } from '@/db/types'
import { formatAuthors } from '@/lib/authors'

type CaptureBookPickerProps = {
  books: Book[]
  book: Book
  onSelect: (id: string) => void
}

export function CaptureBookPicker({ books, book, onSelect }: CaptureBookPickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <p className="text-[13px] leading-[18px] font-medium text-muted">Книга</p>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={`Книга: ${book.title}. Изменить`}
        className="mt-1 flex min-h-14 w-full items-center gap-3 rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-left"
      >
        <BookCover book={book} className="w-8 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] leading-[20px] font-medium text-ink">
            {book.title}
          </span>
          <span className="block truncate text-[12px] leading-[16px] text-muted">
            {formatAuthors(book.authors, true)}
          </span>
        </span>
        <CaretDown
          size={16}
          aria-hidden
          className={[
            'shrink-0 text-muted transition-transform duration-150',
            open ? 'rotate-180' : '',
          ].join(' ')}
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label="Выбрать книгу"
          className="mt-1 max-h-60 overflow-y-auto rounded-[var(--radius-control)] border border-line bg-surface p-1"
        >
          {books.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                aria-selected={item.id === book.id}
                onClick={() => {
                  onSelect(item.id)
                  setOpen(false)
                }}
                className={[
                  'flex min-h-11 w-full items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-left',
                  item.id === book.id ? 'bg-accent-soft text-accent' : 'text-ink',
                ].join(' ')}
              >
                <BookCover book={item} className="w-6 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] leading-[18px] font-medium">
                    {item.title}
                  </span>
                  <span className="block truncate text-[11px] leading-[14px] opacity-70">
                    {formatAuthors(item.authors, true)}
                  </span>
                </span>
                {item.id === book.id ? <Check size={16} className="shrink-0" aria-hidden /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
