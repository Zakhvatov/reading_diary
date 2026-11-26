import { nowISO } from '@/lib/id'
import { db } from '../db'
import type { ID, Quote } from '../types'

export type QuoteInput = {
  bookId: ID
  text: string
  page?: number
  chapter?: string
  note?: string
  favorite?: boolean
  shareable?: boolean
}

export async function createQuote(input: QuoteInput): Promise<Quote> {
  const now = nowISO()
  const quote: Quote = {
    id: crypto.randomUUID(),
    bookId: input.bookId,
    text: input.text.trim(),
    favorite: input.favorite ?? false,
    shareable: input.shareable ?? false,
    createdAt: now,
    updatedAt: now,
  }

  if (input.page !== undefined) quote.page = input.page
  if (input.chapter) quote.chapter = input.chapter
  if (input.note) quote.note = input.note

  await db.quotes.add(quote)
  return quote
}

export async function listQuotesByBook(bookId: ID): Promise<Quote[]> {
  return db.quotes.where('bookId').equals(bookId).toArray()
}

export async function updateQuote(id: ID, patch: Partial<Quote>): Promise<void> {
  const next: Partial<Quote> = { ...patch, updatedAt: nowISO() }
  delete next.id
  delete next.createdAt
  await db.quotes.update(id, next)
}

export async function deleteQuote(id: ID): Promise<void> {
  await db.transaction('rw', [db.quotes, db.tombstones], async () => {
    await db.quotes.delete(id)
    await db.tombstones.add({
      id: crypto.randomUUID(),
      entity: 'quote',
      entityId: id,
      deletedAt: nowISO(),
    })
  })
}
