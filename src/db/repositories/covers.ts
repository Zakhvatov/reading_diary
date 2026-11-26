import { nowISO } from '@/lib/id'
import { db } from '../db'
import type { Cover, ID } from '../types'

export type CoverInput = {
  ownerType: Cover['ownerType']
  ownerId: ID
  blob: Blob
  width: number
  height: number
  sourceUrl?: string
}

export async function saveCover(input: CoverInput): Promise<Cover> {
  const cover: Cover = {
    id: crypto.randomUUID(),
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    blob: input.blob,
    mime: 'image/jpeg',
    width: input.width,
    height: input.height,
    createdAt: nowISO(),
  }

  if (input.sourceUrl) cover.sourceUrl = input.sourceUrl

  await db.covers.add(cover)
  return cover
}

export async function getCover(id: ID): Promise<Cover | undefined> {
  return db.covers.get(id)
}

export async function deleteCover(id: ID): Promise<void> {
  await db.covers.delete(id)
}
