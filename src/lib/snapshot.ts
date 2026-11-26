import { exportBackupZip } from '@/db/backup/export'
import { readSettings, updateSettings } from '@/db/repositories/settings'
import type { ISODate } from '@/db/types'
import { toDay } from '@/lib/dates'

const SNAPSHOT_DIRECTORY = 'snapshots'
const SNAPSHOT_PREFIX = 'reading-diary-'
const SNAPSHOT_SUFFIX = '.zip'
const SNAPSHOT_PATTERN = /^reading-diary-(\d{4}-\d{2}-\d{2})\.zip$/
const DAY_MS = 24 * 60 * 60 * 1000

export const MAX_SNAPSHOTS = 7

export type SnapshotInfo = {
  name: string
  date: ISODate
  size: number
}

export function snapshotFileName(date: Date): string {
  return `${SNAPSHOT_PREFIX}${toDay(date)}${SNAPSHOT_SUFFIX}`
}

export function snapshotDate(name: string): ISODate | null {
  const match = SNAPSHOT_PATTERN.exec(name)
  return match?.[1] ?? null
}

/** Names to delete so that at most `max` snapshots stay. Keeps the newest ones. */
export function pruneSnapshotNames(names: string[], max = MAX_SNAPSHOTS): string[] {
  const current = names.filter((name) => snapshotDate(name) !== null).sort()
  return current.slice(0, Math.max(0, current.length - Math.max(0, max)))
}

export function shouldCreateSnapshot(input: {
  now: Date
  names: string[]
  lastSnapshotAt?: string
}): boolean {
  if (input.names.includes(snapshotFileName(input.now))) return false

  if (input.lastSnapshotAt) {
    const last = Date.parse(input.lastSnapshotAt)
    if (Number.isFinite(last) && input.now.getTime() - last < DAY_MS) return false
  }

  return true
}

export function isSnapshotSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.storage?.getDirectory === 'function'
}

async function snapshotDirectory(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory()
  return root.getDirectoryHandle(SNAPSHOT_DIRECTORY, { create: true })
}

async function snapshotNames(dir: FileSystemDirectoryHandle): Promise<string[]> {
  const names: string[] = []
  for await (const name of dir.keys()) {
    if (snapshotDate(name)) names.push(name)
  }
  return names
}

/** Newest first. Returns an empty list when OPFS is missing or unreadable. */
export async function listSnapshots(): Promise<SnapshotInfo[]> {
  if (!isSnapshotSupported()) return []

  try {
    const dir = await snapshotDirectory()
    const snapshots: SnapshotInfo[] = []

    for await (const [name, handle] of dir.entries()) {
      const date = snapshotDate(name)
      if (!date || handle.kind !== 'file') continue

      const file = await handle.getFile()
      snapshots.push({ name, date, size: file.size })
    }

    return snapshots.sort((left, right) => right.name.localeCompare(left.name))
  } catch {
    return []
  }
}

/**
 * Writes at most one ZIP snapshot per day. Silent by design: a browser without
 * OPFS, a full quota or a failed write must not break the screen.
 */
export async function maybeCreateSnapshot(now = new Date()): Promise<void> {
  if (!isSnapshotSupported()) return

  try {
    const dir = await snapshotDirectory()
    const names = await snapshotNames(dir)
    const settings = await readSettings()

    if (!shouldCreateSnapshot({ now, names, lastSnapshotAt: settings?.lastSnapshotAt })) return

    const blob = await exportBackupZip({ markBackup: false })
    const name = snapshotFileName(now)
    const handle = await dir.getFileHandle(name, { create: true })
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()

    for (const stale of pruneSnapshotNames([...names, name])) {
      await dir.removeEntry(stale)
    }

    await updateSettings({ lastSnapshotAt: now.toISOString() })
  } catch {
    // Snapshots are best effort: the screen keeps working without them.
  }
}

/** Returns the ZIP blob for the existing import pipeline. */
export async function restoreSnapshot(name: string): Promise<Blob> {
  if (!isSnapshotSupported()) throw new Error('Снимки недоступны в этом браузере')
  if (!snapshotDate(name)) throw new Error('Неизвестный снимок')

  try {
    const dir = await snapshotDirectory()
    const handle = await dir.getFileHandle(name)
    return await handle.getFile()
  } catch {
    throw new Error('Не удалось открыть снимок')
  }
}
