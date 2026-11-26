import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db'
import { createBookLink, deleteBookLink, listBookLinks, updateBookLink } from './bookLinks'
import { createBookNote, deleteBookNote, listBookNotes, updateBookNote } from './bookNotes'
import { createBook } from './books'
import {
  createCharacter,
  deleteCharacter,
  listCharactersByBook,
  updateCharacter,
} from './characters'
import { createJournal } from './journals'
import { createQuote } from './quotes'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterAll(() => {
  db.close()
})

describe('diary repositories', () => {
  it('creates, updates and deletes a character with a tombstone', async () => {
    const book = await createBook({ title: 'Книга' })
    const character = await createCharacter({
      bookId: book.id,
      name: '  Герой  ',
      role: 'антагонист',
    })

    expect(character).toMatchObject({ name: 'Герой', note: '', role: 'антагонист' })
    expect(await listCharactersByBook(book.id)).toHaveLength(1)

    await updateCharacter(character.id, { note: 'Выжил' })
    expect((await listCharactersByBook(book.id))[0]).toMatchObject({ note: 'Выжил' })

    await deleteCharacter(character.id)
    expect(await db.characters.count()).toBe(0)
    expect(await db.tombstones.where('entity').equals('character').count()).toBe(1)
  })

  it('keeps plot and insight notes ordered and filters by kind', async () => {
    const book = await createBook({ title: 'Книга' })
    const second = await createBookNote({ bookId: book.id, kind: 'plot', body: 'Второй', order: 2 })
    const first = await createBookNote({ bookId: book.id, kind: 'plot', body: 'Первый', order: 1 })
    const insight = await createBookNote({ bookId: book.id, kind: 'insight', body: 'Мысль' })

    expect((await listBookNotes(book.id, 'plot')).map((note) => note.id)).toEqual([
      first.id,
      second.id,
    ])
    expect(await listBookNotes(book.id, 'insight')).toMatchObject([
      { id: insight.id, tags: [], order: 0 },
    ])

    await updateBookNote(insight.id, { tags: ['идея'] })
    expect((await listBookNotes(book.id, 'insight'))[0]?.tags).toEqual(['идея'])

    await deleteBookNote(first.id)
    expect(await db.tombstones.where('entity').equals('bookNote').count()).toBe(1)
  })

  it('creates, updates and deletes book links', async () => {
    const book = await createBook({ title: 'Книга' })
    const link = await createBookLink({
      bookId: book.id,
      targetTitle: '  Другая книга  ',
      kind: 'same-world',
    })

    expect(link.targetTitle).toBe('Другая книга')
    expect(link.targetBookId).toBeUndefined()

    await updateBookLink(link.id, { note: 'Та же вселенная' })
    expect((await listBookLinks(book.id))[0]).toMatchObject({ note: 'Та же вселенная' })

    await deleteBookLink(link.id)
    expect(await db.bookLinks.count()).toBe(0)
    expect(await db.tombstones.where('entity').equals('bookLink').count()).toBe(1)
  })

  it('defaults shareable flags and tags for quotes and journals', async () => {
    const book = await createBook({ title: 'Книга' })
    const quote = await createQuote({ bookId: book.id, text: 'Цитата' })
    const journal = await createJournal({
      title: 'Запись',
      body: '',
      color: 'pine',
      entryDate: '2026-02-01',
    })

    expect(quote).toMatchObject({ favorite: false, shareable: false })
    expect(journal).toMatchObject({ tags: [], shareable: false })
  })
})
