import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo } from 'react'
import { getCover } from '@/db/repositories/covers'
import type { ID } from '@/db/types'

type JournalPhotoProps = {
  photoId?: ID
  className?: string
  alt?: string
}

/** Фото записи живёт в covers(ownerType='journal'), наружу отдаём только blob URL. */
export function JournalPhoto({ photoId, className, alt = '' }: JournalPhotoProps) {
  const cover = useLiveQuery(() => (photoId ? getCover(photoId) : undefined), [photoId])
  const url = useMemo(() => (cover ? URL.createObjectURL(cover.blob) : null), [cover])

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])

  if (!url) return null

  return <img src={url} alt={alt} className={className} />
}
