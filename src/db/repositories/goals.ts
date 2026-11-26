import { nowISO } from '@/lib/id'
import { db } from '../db'
import type { Goal } from '../types'

export async function getGoal(year: number): Promise<Goal | undefined> {
  return db.goals.where('year').equals(year).first()
}

export async function setGoal(year: number, targetBooks: number): Promise<Goal> {
  const existing = await getGoal(year)
  const now = nowISO()

  if (existing) {
    await db.goals.update(existing.id, { targetBooks, updatedAt: now })
    return { ...existing, targetBooks, updatedAt: now }
  }

  const goal: Goal = {
    id: crypto.randomUUID(),
    year,
    targetBooks,
    createdAt: now,
    updatedAt: now,
  }

  await db.goals.add(goal)
  return goal
}

export async function deleteGoal(year: number): Promise<void> {
  const goal = await getGoal(year)
  if (!goal) return

  await db.transaction('rw', [db.goals, db.tombstones], async () => {
    await db.goals.delete(goal.id)
    await db.tombstones.add({
      id: crypto.randomUUID(),
      entity: 'goal',
      entityId: goal.id,
      deletedAt: nowISO(),
    })
  })
}
