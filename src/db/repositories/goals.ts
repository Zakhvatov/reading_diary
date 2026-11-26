import { nowISO } from '@/lib/id'
import { db } from '../db'
import type { Goal } from '../types'

function normalizeTarget(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(Math.max(Math.round(value), 1), 9999)
}

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

/** Одна цель на год: при существующей записи обновляет её. */
export async function createGoal(year: number, targetBooks: number): Promise<Goal> {
  return setGoal(year, normalizeTarget(targetBooks))
}

/** Обновляет цель года; если записи ещё нет — создаёт её. */
export async function updateGoal(year: number, targetBooks: number): Promise<Goal> {
  return setGoal(year, normalizeTarget(targetBooks))
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
