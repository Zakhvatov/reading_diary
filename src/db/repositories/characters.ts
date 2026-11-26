import { nowISO } from '@/lib/id'
import { db } from '../db'
import type { Character, ID } from '../types'

export type CharacterInput = {
  bookId: ID
  name: string
  role?: string
  note?: string
  spoiler?: boolean
}

export async function createCharacter(input: CharacterInput): Promise<Character> {
  const now = nowISO()
  const character: Character = {
    id: crypto.randomUUID(),
    bookId: input.bookId,
    name: input.name.trim(),
    note: input.note ?? '',
    createdAt: now,
    updatedAt: now,
  }

  if (input.role) character.role = input.role
  if (input.spoiler) character.spoiler = true

  await db.characters.add(character)
  return character
}

export async function getCharacter(id: ID): Promise<Character | undefined> {
  return db.characters.get(id)
}

export async function listCharactersByBook(bookId: ID): Promise<Character[]> {
  const characters = await db.characters.where('bookId').equals(bookId).toArray()
  return characters.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function updateCharacter(id: ID, patch: Partial<Character>): Promise<void> {
  const next: Partial<Character> = { ...patch, updatedAt: nowISO() }
  delete next.id
  delete next.createdAt
  await db.characters.update(id, next)
}

export async function deleteCharacter(id: ID): Promise<void> {
  await db.transaction('rw', [db.characters, db.tombstones], async () => {
    await db.characters.delete(id)
    await db.tombstones.add({
      id: crypto.randomUUID(),
      entity: 'character',
      entityId: id,
      deletedAt: nowISO(),
    })
  })
}
