import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo } from 'react'
import { getCover } from '@/db/repositories/covers'
import type { Book } from '@/db/types'

type CoverBook = Pick<Book, 'title' | 'authors' | 'coverId'>

const placeholderTones = [
  'bg-accent-soft',
  'bg-line/70',
  'bg-signal-soft',
  'bg-accent-soft/60',
  'bg-line/50',
  'bg-accent-soft/35',
]

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

  const tone = placeholderTones[hash(book.title) % placeholderTones.length] ?? 'bg-accent-soft'

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
        <div className="flex h-full items-center justify-center">
          <span className="font-display text-[28px] leading-none font-medium text-accent/80">
            {initials(book)}
          </span>
        </div>
      )}
    </div>
  )
}
