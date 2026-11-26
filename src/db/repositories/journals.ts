import { nowISO } from '@/lib/id'
import type { BoardNote } from '@/lib/board'
import { db } from '../db'
import type { ID, JournalEntry } from '../types'

export type JournalInput = {
  title: string
  body: string
  color: JournalEntry['color']
  entryDate: string
  bookId?: ID
  photoIds?: ID[]
  board?: BoardNote[]
  tags?: string[]
  mood?: string
  shareable?: boolean
}

export async function createJournal(input: JournalInput): Promise<JournalEntry> {
  const now = nowISO()
  const entry: JournalEntry = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    body: input.body,
    color: input.color,
    photoIds: input.photoIds ?? [],
    board: input.board ?? [],
    entryDate: input.entryDate,
    tags: input.tags ?? [],
    shareable: input.shareable ?? false,
    createdAt: now,
    updatedAt: now,
  }

  if (input.bookId) entry.bookId = input.bookId
  if (input.mood) entry.mood = input.mood

  await db.journals.add(entry)
  return entry
}

export async function getJournal(id: ID): Promise<JournalEntry | undefined> {
  return db.journals.get(id)
}

export async function listJournals(): Promise<JournalEntry[]> {
  const entries = await db.journals.toArray()
  return entries.sort((a, b) => b.entryDate.localeCompare(a.entryDate))
}

export async function updateJournal(id: ID, patch: Partial<JournalEntry>): Promise<void> {
  const next: Partial<JournalEntry> = { ...patch, updatedAt: nowISO() }
  delete next.id
  delete next.createdAt
  await db.journals.update(id, next)
}

export async function deleteJournal(id: ID): Promise<void> {
  await db.transaction('rw', [db.journals, db.covers, db.tombstones], async () => {
    await db.journals.delete(id)
    await db.covers.where('ownerId').equals(id).delete()
    await db.tombstones.add({
      id: crypto.randomUUID(),
      entity: 'journal',
      entityId: id,
      deletedAt: nowISO(),
    })
  })
}
