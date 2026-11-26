import { nowISO } from '@/lib/id'
import { db } from '../db'
import type { BookNote, BookNoteKind, ID } from '../types'

export type BookNoteInput = {
  bookId: ID
  kind: BookNoteKind
  title?: string
  chapter?: string
  body: string
  tags?: string[]
  order?: number
}

const KIND_ORDER: Record<BookNoteKind, number> = { plot: 0, insight: 1 }

export async function createBookNote(input: BookNoteInput): Promise<BookNote> {
  const now = nowISO()
  const note: BookNote = {
    id: crypto.randomUUID(),
    bookId: input.bookId,
    kind: input.kind,
    body: input.body,
    tags: input.tags ?? [],
    order: input.order ?? 0,
    createdAt: now,
    updatedAt: now,
  }

  if (input.title) note.title = input.title
  if (input.chapter) note.chapter = input.chapter

  await db.bookNotes.add(note)
  return note
}

export async function getBookNote(id: ID): Promise<BookNote | undefined> {
  return db.bookNotes.get(id)
}

export async function listBookNotes(bookId: ID, kind?: BookNoteKind): Promise<BookNote[]> {
  const notes = await db.bookNotes.where('bookId').equals(bookId).toArray()

  return notes
    .filter((note) => !kind || note.kind === kind)
    .sort(
      (a, b) =>
        KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
        a.order - b.order ||
        a.createdAt.localeCompare(b.createdAt),
    )
}

export async function updateBookNote(id: ID, patch: Partial<BookNote>): Promise<void> {
  const next: Partial<BookNote> = { ...patch, updatedAt: nowISO() }
  delete next.id
  delete next.createdAt
  await db.bookNotes.update(id, next)
}

export async function deleteBookNote(id: ID): Promise<void> {
  await db.transaction('rw', [db.bookNotes, db.tombstones], async () => {
    await db.bookNotes.delete(id)
    await db.tombstones.add({
      id: crypto.randomUUID(),
      entity: 'bookNote',
      entityId: id,
      deletedAt: nowISO(),
    })
  })
}
