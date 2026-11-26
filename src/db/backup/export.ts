import { strToU8, zipSync } from 'fflate'
import { nowISO } from '@/lib/id'
import { db } from '../db'
import { updateSettings } from '../repositories/settings'
import type { BackupData, BackupManifest, CoverMeta } from '../schema'
import type { Cover } from '../types'
import { BACKUP_SCHEMA_VERSION } from './normalize'

export type ExportOptions = { includeCovers?: boolean; appVersion?: string }

function toCoverMeta(cover: Cover): CoverMeta {
  const meta: CoverMeta = {
    id: cover.id,
    ownerType: cover.ownerType,
    ownerId: cover.ownerId,
    mime: cover.mime,
    width: cover.width,
    height: cover.height,
    createdAt: cover.createdAt,
  }

  if (cover.sourceUrl) meta.sourceUrl = cover.sourceUrl
  return meta
}

async function collectData(): Promise<BackupData> {
  const [books, readings, sessions, quotes, journals, goals, settings, tombstones, covers] =
    await Promise.all([
      db.books.toArray(),
      db.readings.toArray(),
      db.sessions.toArray(),
      db.quotes.toArray(),
      db.journals.toArray(),
      db.goals.toArray(),
      db.settings.toArray(),
      db.tombstones.toArray(),
      db.covers.toArray(),
    ])

  return {
    books,
    readings,
    sessions,
    quotes,
    journals,
    goals,
    settings,
    tombstones,
    covers: covers.map(toCoverMeta),
  }
}

function buildManifest(data: BackupData, appVersion?: string): BackupManifest {
  return {
    format: 'reading-diary-backup',
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: nowISO(),
    appVersion: appVersion ?? __APP_VERSION__,
    counts: {
      books: data.books.length,
      readings: data.readings.length,
      sessions: data.sessions.length,
      quotes: data.quotes.length,
      journals: data.journals.length,
      goals: data.goals.length,
      settings: data.settings.length,
      tombstones: data.tombstones.length,
      covers: data.covers.length,
    },
  }
}

export async function exportBackupZip(options: ExportOptions = {}): Promise<Blob> {
  const includeCovers = options.includeCovers ?? true
  const [data, coverRows] = await Promise.all([collectData(), db.covers.toArray()])

  const entries: Record<string, Uint8Array> = {
    'manifest.json': strToU8(JSON.stringify(buildManifest(data, options.appVersion), null, 2)),
    'data.json': strToU8(JSON.stringify(data, null, 2)),
  }

  if (includeCovers) {
    for (const cover of coverRows) {
      entries[`covers/${cover.id}.jpg`] = new Uint8Array(await cover.blob.arrayBuffer())
    }
  }

  const zip = zipSync(entries)
  await updateSettings({ lastBackupAt: nowISO() })
  return new Blob([zip], { type: 'application/zip' })
}

export async function exportBackupJson(): Promise<Blob> {
  const data = await collectData()
  const payload = {
    manifest: buildManifest(data),
    data: { ...data, covers: [] },
  }

  await updateSettings({ lastBackupAt: nowISO() })
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
}
