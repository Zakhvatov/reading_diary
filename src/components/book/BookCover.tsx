import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo } from 'react'
import { getCover } from '@/db/repositories/covers'
import type { Book } from '@/db/types'

type CoverBook = Pick<Book, 'title' | 'authors' | 'coverId'>

const placeholderTones = [
  ['bg-lilac', 'text-lilac-ink'],
  ['bg-peach', 'text-peach-ink'],
  ['bg-butter', 'text-butter-ink'],
  ['bg-sage', 'text-sage-ink'],
  ['bg-sky', 'text-sky-ink'],
  ['bg-rose', 'text-rose-ink'],
] as const

function hash(value: string): number {
  let result = 0
  for (const character of value) {
    result = (result * 31 + character.charCodeAt(0)) % 997
  }
  return result
}

function initials(book: CoverBook): string {
  const stopWords = new Set(['и', 'в', 'на', 'с', 'о', 'the', 'a', 'of'])
  const words = [...book.title.split(/\s+/), ...book.authors]
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((word) => word.length > 0 && !stopWords.has(word.toLowerCase()))

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

type BookCoverProps = {
  book: CoverBook
  className?: string
}

export function BookCover({ book, className }: BookCoverProps) {
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

  const [tone, toneInk] =
    placeholderTones[hash(book.title) % placeholderTones.length] ?? placeholderTones[0]

  return (
    <div
      className={[
        'relative aspect-[2/3] overflow-hidden rounded-[10px]',
        url ? 'bg-line/60' : tone,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div
          className={['relative flex h-full flex-col justify-between p-2 pl-3', toneInk].join(' ')}
        >
          <span className="absolute inset-y-0 left-0 w-[5px] bg-current opacity-20" aria-hidden />
          <span className="font-display text-[26px] leading-none font-semibold">
            {initials(book)}
          </span>
          {book.authors[0] ? (
            <span className="line-clamp-2 text-[9px] leading-[11px] opacity-70">
              {book.authors[0]}
            </span>
          ) : null}
        </div>
      )}
    </div>
  )
}
