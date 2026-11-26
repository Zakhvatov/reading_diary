import { today } from '@/lib/dates'

const BACKUP_BANNER_KEY = 'rd.backup-banner-dismissed.v1'
const STALE_BACKUP_MS = 7 * 24 * 60 * 60 * 1000

/** Бэкапа не было или он старше семи дней. */
export function isBackupStale(lastBackupAt?: string): boolean {
  if (!lastBackupAt) return true

  const time = Date.parse(lastBackupAt)
  if (!Number.isFinite(time)) return true

  return Date.now() - time >= STALE_BACKUP_MS
}

/** Баннер закрыт сегодня и вернётся завтра. */
export function isBackupBannerDismissed(): boolean {
  try {
    return localStorage.getItem(BACKUP_BANNER_KEY) === today()
  } catch {
    return false
  }
}

export function dismissBackupBanner(): void {
  try {
    localStorage.setItem(BACKUP_BANNER_KEY, today())
  } catch {
    // Приватный режим может запрещать запись — баннер скроется до перезагрузки.
  }
}
