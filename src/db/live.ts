import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { listBookLinks } from './repositories/bookLinks'
import { listBookNotes } from './repositories/bookNotes'
import { getBook, listBooks } from './repositories/books'
import { listCharactersByBook } from './repositories/characters'
import { getGoal } from './repositories/goals'
import { listJournals } from './repositories/journals'
import { listReadings } from './repositories/readings'
import { listSessionsByBook } from './repositories/sessions'
import { readSettings } from './repositories/settings'
import type { BookNoteKind, BookStatus, ID } from './types'

export function useBooks(status?: BookStatus) {
  return useLiveQuery(() => listBooks(status), [status])
}

export function useBook(id?: ID) {
  return useLiveQuery(() => (id ? getBook(id) : undefined), [id])
}

export function useSessionsByBook(bookId?: ID) {
  return useLiveQuery(() => (bookId ? listSessionsByBook(bookId) : []), [bookId])
}

export function useReadings(bookId?: ID) {
  return useLiveQuery(() => (bookId ? listReadings(bookId) : []), [bookId])
}

export function useJournals() {
  return useLiveQuery(() => listJournals(), [])
}

export function useCharacters(bookId?: ID) {
  return useLiveQuery(() => (bookId ? listCharactersByBook(bookId) : []), [bookId])
}

export function useBookNotes(bookId?: ID, kind?: BookNoteKind) {
  return useLiveQuery(() => (bookId ? listBookNotes(bookId, kind) : []), [bookId, kind])
}

export function useBookLinks(bookId?: ID) {
  return useLiveQuery(() => (bookId ? listBookLinks(bookId) : []), [bookId])
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
