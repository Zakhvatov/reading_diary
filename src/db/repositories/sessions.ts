import { toDay } from '@/lib/dates'
import { nowISO } from '@/lib/id'
import { applySessionProgress } from '@/lib/progress'
import { db } from '../db'
import type { ID, Session, SessionKind } from '../types'
import { finishReading, startReading } from './readings'

export type SessionInput = {
  bookId: ID
  startedAt: string
  durationMs: number
  endedAt?: string
  day?: string
  pagesRead?: number
  startPage?: number
  endPage?: number
  kind?: SessionKind
  note?: string
}

export async function addSession(input: SessionInput): Promise<Session> {
  if (input.durationMs <= 0) {
    throw new Error('Длительность сессии должна быть больше нуля')
  }

  return db.transaction('rw', [db.books, db.readings, db.sessions, db.tombstones], async () => {
    const book = await db.books.get(input.bookId)

    if (!book) {
      throw new Error('Книга не найдена')
    }

    const now = nowISO()
    const startedAt = new Date(input.startedAt)
    const session: Session = {
      id: crypto.randomUUID(),
      bookId: input.bookId,
      day: input.day ?? toDay(startedAt),
      startedAt: input.startedAt,
      endedAt: input.endedAt ?? new Date(startedAt.getTime() + input.durationMs).toISOString(),
      durationMs: input.durationMs,
      pagesRead: input.pagesRead ?? 0,
      kind: input.kind ?? 'manual',
      createdAt: now,
      updatedAt: now,
    }

    if (input.startPage !== undefined) session.startPage = input.startPage
    if (input.endPage !== undefined) session.endPage = input.endPage
    if (input.note) session.note = input.note

    await db.sessions.add(session)

    const progressPatch = applySessionProgress(book, session)
    if (Object.keys(progressPatch).length > 0) {
      await db.books.update(book.id, { ...progressPatch, updatedAt: now })
    }

    if (progressPatch.status === 'finished') {
      await finishReading(book.id, session.day)
    } else if (progressPatch.status === 'reading') {
      await startReading(book.id, session.day)
    }

    await recalcBookStatsInTransaction(book.id)
    return session
  })
}

export async function getSession(id: ID): Promise<Session | undefined> {
  return db.sessions.get(id)
}

export async function listSessionsByBook(bookId: ID): Promise<Session[]> {
  const sessions = await db.sessions.where('bookId').equals(bookId).toArray()
  return sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

export async function listSessionsByDay(day: string): Promise<Session[]> {
  const sessions = await db.sessions.where('day').equals(day).toArray()
  return sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

export async function updateSession(id: ID, patch: Partial<Session>): Promise<void> {
  await db.transaction('rw', [db.books, db.sessions], async () => {
    const session = await db.sessions.get(id)
    if (!session) return

    const next: Partial<Session> = { ...patch, updatedAt: nowISO() }
    delete next.id
    delete next.createdAt

    await db.sessions.update(id, next)
    await recalcBookStatsInTransaction(session.bookId)
  })
}

export async function deleteSession(id: ID): Promise<void> {
  await db.transaction('rw', [db.books, db.sessions, db.tombstones], async () => {
    const session = await db.sessions.get(id)
    if (!session) return

    await db.sessions.delete(id)
    await db.tombstones.add({
      id: crypto.randomUUID(),
      entity: 'session',
      entityId: id,
      deletedAt: nowISO(),
    })
    await recalcBookStatsInTransaction(session.bookId)
  })
}

export async function recalcBookStats(bookId: ID): Promise<void> {
  await recalcBookStatsInTransaction(bookId)
}

async function recalcBookStatsInTransaction(bookId: ID): Promise<void> {
  const sessions = await db.sessions.where('bookId').equals(bookId).toArray()

  const totalReadingMs = sessions.reduce((total, session) => total + session.durationMs, 0)
  const pagesReadTotal = sessions.reduce((total, session) => total + session.pagesRead, 0)

  await db.books.update(bookId, {
    totalReadingMs,
    sessionCount: sessions.length,
    pagesReadTotal,
    updatedAt: nowISO(),
  })
}
