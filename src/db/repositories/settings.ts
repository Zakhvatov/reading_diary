import { nowISO } from '@/lib/id'
import { db } from '../db'
import type { Settings } from '../types'

export async function readSettings(): Promise<Settings | undefined> {
  return db.settings.get('app')
}

export async function getSettings(): Promise<Settings> {
  const existing = await db.settings.get('app')
  if (existing) return existing

  const now = nowISO()
  const settings: Settings = {
    id: 'app',
    onboardingDone: true,
    defaultStatus: 'want',
    dailyGoalMinutes: 0,
    persistGranted: false,
    schemaVersion: 2,
    createdAt: now,
    updatedAt: now,
  }

  await db.settings.put(settings)
  return settings
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<void> {
  const current = await getSettings()
  await db.settings.put({ ...current, ...patch, id: 'app', updatedAt: nowISO() })
}
