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
    defaultTemplate: 'lite',
    defaultRatingScale: 'stars5',
    dailyGoalMinutes: 0,
    persistGranted: false,
    schemaVersion: 6,
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

/** Asks the browser to keep the origin's data and remembers the answer. */
export async function requestPersistence(): Promise<boolean> {
  const storage = typeof navigator === 'undefined' ? undefined : navigator.storage
  let granted = false

  try {
    if (storage) {
      if (typeof storage.persist === 'function') granted = await storage.persist()
      else if (typeof storage.persisted === 'function') granted = await storage.persisted()
    }
  } catch {
    granted = false
  }

  await updateSettings({ persistGranted: granted })
  return granted
}
