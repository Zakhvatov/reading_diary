import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo } from 'react'
import { getCover } from '@/db/repositories/covers'
import type { Book } from '@/db/types'

type CoverBook = Pick<Book, 'title' | 'authors' | 'coverId'>

const placeholderTones = [
  'bg-cover-forest',
  'bg-cover-clay',
  'bg-cover-navy',
  'bg-cover-ochre',
  'bg-cover-plum',
  'bg-cover-teal',
  'bg-cover-slate',
  'bg-cover-wine',
] as const

function hash(value: string): number {
  let result = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index)
    result = Math.imul(result, 16777619)
  }
  return result >>> 0
}

type BookCoverProps = {
  book: CoverBook
  className?: string
  /** Только цветной корешок: для маленьких обложек, где текст читает подпись. */
  plain?: boolean
}

export function BookCover({ book, className, plain = false }: BookCoverProps) {
  const cover = useLiveQuery(
    () => (book.coverId ? getCover(book.coverId) : undefined),
    [book.coverId],
  )
  const url = useMemo(() => (cover ? URL.createObjectURL(cover.blob) : null), [cover])

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])

  const tone =
    placeholderTones[hash(book.title + book.authors[0]) % placeholderTones.length] ??
    placeholderTones[0]
  const label = book.title.trim() || book.authors[0] || 'Книга'

  return (
    <div
      className={[
        'book-cover relative aspect-[2/3] overflow-hidden rounded-[6px] border border-black/10',
        url ? 'bg-line/60' : tone,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : plain ? (
        <>
          <span className="absolute inset-y-0 left-0 w-[4px] bg-cover-ink/25" aria-hidden />
          <span
            className="absolute inset-[5px] rounded-[2px] border border-cover-ink/20"
            aria-hidden
          />
          <span
            className="absolute inset-0 grid place-items-center font-display text-[20px] text-cover-ink/45"
            aria-hidden
          >
            {label.charAt(0)}
          </span>
        </>
      ) : (
        <div className="relative flex h-full flex-col justify-between gap-2 p-2.5 pl-3 text-cover-ink [container-type:inline-size]">
          <span className="absolute inset-y-0 left-0 w-[4px] bg-cover-ink/25" aria-hidden />
          {book.authors[0] ? (
            <span className="cover-author line-clamp-1 text-[clamp(8px,3.1cqw,10px)] tracking-[0.08em] uppercase text-cover-ink/60">
              {book.authors[0]}
            </span>
          ) : (
            <span aria-hidden />
          )}
          <span
            className="line-clamp-4 font-display font-medium tracking-[-0.01em] text-cover-ink"
            style={{ fontSize: 'clamp(10px, 8.2cqw, 19px)', lineHeight: 1.15 }}
          >
            {label}
          </span>
        </div>
      )}
    </div>
  )
}
