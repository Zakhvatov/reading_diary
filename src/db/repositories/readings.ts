import { today } from '@/lib/dates'
import { nowISO } from '@/lib/id'
import { db } from '../db'
import type { BookStatus, ID, ISODate, Reading } from '../types'

export async function listReadings(bookId: ID): Promise<Reading[]> {
  const readings = await db.readings.where('bookId').equals(bookId).toArray()

  return readings.sort(
    (a, b) =>
      (a.startedAt ?? a.createdAt).localeCompare(b.startedAt ?? b.createdAt) ||
      a.createdAt.localeCompare(b.createdAt),
  )
}

export async function getOpenReading(bookId: ID): Promise<Reading | undefined> {
  return db.readings.where('[bookId+status]').equals([bookId, 'reading']).first()
}

export async function startReading(bookId: ID, startedAt: ISODate = today()): Promise<Reading> {
  return db.transaction('rw', db.readings, async () => {
    const open = await getOpenReading(bookId)
    if (open) return open

    const now = nowISO()
    const reading: Reading = {
      id: crypto.randomUUID(),
      bookId,
      status: 'reading',
      startedAt,
      createdAt: now,
      updatedAt: now,
    }

    await db.readings.add(reading)
    return reading
  })
}

export async function finishReading(
  bookId: ID,
  finishedAt: ISODate = today(),
  startedAt?: ISODate,
): Promise<void> {
  await db.transaction('rw', db.readings, async () => {
    const open = await getOpenReading(bookId)
    const now = nowISO()

    if (open) {
      await db.readings.update(open.id, {
        status: 'finished',
        startedAt: open.startedAt ?? startedAt ?? finishedAt,
        finishedAt,
        updatedAt: now,
      })
      return
    }

    await db.readings.add({
      id: crypto.randomUUID(),
      bookId,
      status: 'finished',
      startedAt: startedAt ?? finishedAt,
      finishedAt,
      createdAt: now,
      updatedAt: now,
    })
  })
}

export async function abandonReading(bookId: ID, finishedAt: ISODate = today()): Promise<void> {
  await db.transaction('rw', db.readings, async () => {
    const open = await getOpenReading(bookId)
    if (!open) return

    await db.readings.update(open.id, {
      status: 'dnf',
      startedAt: open.startedAt ?? finishedAt,
      finishedAt,
      updatedAt: nowISO(),
    })
  })
}

/** Статус «в планах» отменяет только незавершённую попытку, история остаётся. */
export async function clearOpenReading(bookId: ID): Promise<void> {
  await db.readings.where('[bookId+status]').equals([bookId, 'reading']).delete()
}

/**
 * Приводит историю прочтений в соответствие со сменой статуса книги.
 * Перечитывание после «прочитано» или «брошено» создаёт новую запись.
 */
export async function applyBookStatusChange(input: {
  bookId: ID
  from: BookStatus
  to: BookStatus
  finishedAt?: ISODate
}): Promise<void> {
  const day = today()

  switch (input.to) {
    case 'reading':
    case 'rereading':
      await startReading(input.bookId, day)
      return
    case 'finished':
      await finishReading(input.bookId, input.finishedAt ?? day)
      return
    case 'dnf':
      await abandonReading(input.bookId, input.finishedAt ?? day)
      return
    case 'want':
      await clearOpenReading(input.bookId)
  }
}
