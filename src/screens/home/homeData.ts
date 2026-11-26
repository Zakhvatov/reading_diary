import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import {
  dismissBackupBanner,
  isBackupBannerDismissed,
  isBackupStale,
} from '@/components/home/backup'
import { useBooks, useDaySessions, useJournals, useSettings } from '@/db/live'
import { getStreak, type StreakInfo } from '@/db/queries/streak'
import type { Book, ISODate, JournalEntry, Session, Settings } from '@/db/types'
import { shelfOf } from '@/lib/bookStatus'
import { today } from '@/lib/dates'

export type HomeData = {
  anchor: ISODate
  books: Book[] | undefined
  current: Book | undefined
  recent: Book[]
  sessions: Session[] | undefined
  journals: JournalEntry[] | undefined
  settings: Settings | undefined
  streak: StreakInfo | undefined
  minutes: number
  pages: number
  finishedThisYear: number
  loading: boolean
  backupStale: boolean
}

/**
 * Один источник данных для всех тем главной.
 * Тема решает, как это показать, а не что загрузить.
 */
export function useHomeData(): HomeData {
  const anchor = today()
  const books = useBooks()
  const sessions = useDaySessions(anchor)
  const settings = useSettings()
  const journals = useJournals()
  const streak = useLiveQuery(() => getStreak(anchor), [anchor])

  const current = (books ?? []).find((book) => shelfOf(book.status) === 'reading')
  const minutes = Math.round(
    (sessions ?? []).reduce((total, session) => total + session.durationMs, 0) / 60_000,
  )
  const pages = (sessions ?? []).reduce((total, session) => total + session.pagesRead, 0)
  const year = new Date().getFullYear()
  const finishedThisYear = (books ?? []).filter((book) =>
    book.finishedAt?.startsWith(String(year)),
  ).length
  const recent = (books ?? [])
    .filter((book) => book.status === 'finished' && book.finishedAt)
    .sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? ''))
    .slice(0, 6)

  return {
    anchor,
    books,
    current,
    recent,
    sessions,
    journals,
    settings,
    streak,
    minutes,
    pages,
    finishedThisYear,
    loading: books === undefined || settings === undefined || sessions === undefined,
    backupStale:
      settings !== undefined && !isBackupBannerDismissed() && isBackupStale(settings.lastBackupAt),
  }
}

/** Баннер бэкапа: состояние живёт в localStorage, тема только рисует. */
export function useHomeBackupBanner(stale: boolean) {
  const [hidden, setHidden] = useState(isBackupBannerDismissed)

  return {
    show: stale && !hidden,
    dismiss: () => {
      dismissBackupBanner()
      setHidden(true)
    },
  }
}
