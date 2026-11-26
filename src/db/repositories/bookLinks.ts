import { nowISO } from '@/lib/id'
import { db } from '../db'
import type { BookLink, BookLinkKind, ID } from '../types'

export type BookLinkInput = {
  bookId: ID
  targetBookId?: ID
  targetTitle: string
  kind: BookLinkKind
  note?: string
}

export async function createBookLink(input: BookLinkInput): Promise<BookLink> {
  const now = nowISO()
  const link: BookLink = {
    id: crypto.randomUUID(),
    bookId: input.bookId,
    targetTitle: input.targetTitle.trim(),
    kind: input.kind,
    createdAt: now,
    updatedAt: now,
  }

  if (input.targetBookId) link.targetBookId = input.targetBookId
  if (input.note) link.note = input.note

  await db.bookLinks.add(link)
  return link
}

export async function getBookLink(id: ID): Promise<BookLink | undefined> {
  return db.bookLinks.get(id)
}

export async function listBookLinks(bookId: ID): Promise<BookLink[]> {
  const links = await db.bookLinks.where('bookId').equals(bookId).toArray()
  return links.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function updateBookLink(id: ID, patch: Partial<BookLink>): Promise<void> {
  const next: Partial<BookLink> = { ...patch, updatedAt: nowISO() }
  delete next.id
  delete next.createdAt
  await db.bookLinks.update(id, next)
}

export async function deleteBookLink(id: ID): Promise<void> {
  await db.transaction('rw', [db.bookLinks, db.tombstones], async () => {
    await db.bookLinks.delete(id)
    await db.tombstones.add({
      id: crypto.randomUUID(),
      entity: 'bookLink',
      entityId: id,
      deletedAt: nowISO(),
    })
  })
}
