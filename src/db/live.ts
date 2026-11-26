import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { getBook, listBooks } from './repositories/books'
import { getGoal } from './repositories/goals'
import { listJournals } from './repositories/journals'
import { listSessionsByBook } from './repositories/sessions'
import { readSettings } from './repositories/settings'
import type { BookStatus, ID } from './types'

export function useBooks(status?: BookStatus) {
  return useLiveQuery(() => listBooks(status), [status])
}

export function useBook(id?: ID) {
  return useLiveQuery(() => (id ? getBook(id) : undefined), [id])
}

export function useSessionsByBook(bookId?: ID) {
  return useLiveQuery(() => (bookId ? listSessionsByBook(bookId) : []), [bookId])
}

export function useJournals() {
  return useLiveQuery(() => listJournals(), [])
}

export function useGoal(year: number) {
  return useLiveQuery(() => getGoal(year), [year])
}

export function useSettings() {
  return useLiveQuery(() => readSettings(), [])
}

export function useDaySessions(day: string) {
  return useLiveQuery(() => db.sessions.where('day').equals(day).toArray(), [day])
}
