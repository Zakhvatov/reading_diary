import { describe, expect, it } from 'vitest'
import {
  MAX_SNAPSHOTS,
  pruneSnapshotNames,
  shouldCreateSnapshot,
  snapshotDate,
  snapshotFileName,
} from './snapshot'

function names(dates: string[]): string[] {
  return dates.map((date) => `reading-diary-${date}.zip`)
}

function day(year: number, month: number, dayOfMonth: number): Date {
  return new Date(year, month - 1, dayOfMonth, 12, 0, 0)
}

describe('snapshot names', () => {
  it('builds a dated zip name', () => {
    expect(snapshotFileName(new Date(2026, 10, 26))).toBe('reading-diary-2026-11-26.zip')
  })

  it('parses the date and rejects foreign names', () => {
    expect(snapshotDate('reading-diary-2026-11-26.zip')).toBe('2026-11-26')
    expect(snapshotDate('reading-diary-2026-11-26.json')).toBeNull()
    expect(snapshotDate('reading-diary-latest.zip')).toBeNull()
    expect(snapshotDate('backup.zip')).toBeNull()
  })
})

describe('pruneSnapshotNames', () => {
  it('keeps the newest seven snapshots', () => {
    const all = names([
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
    ])

    expect(pruneSnapshotNames(all)).toEqual(['reading-diary-2026-11-01.zip'])
  })

  it('removes several old snapshots when the limit is exceeded', () => {
    const all = names([
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
      '2026-11-09',
      '2026-11-10',
    ])

    expect(pruneSnapshotNames(all)).toEqual(names(['2026-11-01', '2026-11-02', '2026-11-03']))
  })

  it('removes nothing at or below the limit', () => {
    const all = names(['2026-11-04', '2026-11-05', '2026-11-06'])

    expect(pruneSnapshotNames(all)).toEqual([])
    expect(pruneSnapshotNames(all, MAX_SNAPSHOTS)).toEqual([])
  })

  it('ignores files that are not snapshots', () => {
    const all = [...names(['2026-11-01', '2026-11-02']), 'notes.txt', 'reading-diary-today.zip']

    expect(pruneSnapshotNames(all, 1)).toEqual(['reading-diary-2026-11-01.zip'])
  })

  it('handles a zero limit', () => {
    expect(pruneSnapshotNames(names(['2026-11-01', '2026-11-02']), 0)).toEqual(
      names(['2026-11-01', '2026-11-02']),
    )
  })
})

describe('shouldCreateSnapshot', () => {
  const now = day(2026, 11, 26)

  it('creates the first snapshot', () => {
    expect(shouldCreateSnapshot({ now, names: [] })).toBe(true)
  })

  it('skips when a snapshot for today already exists', () => {
    expect(shouldCreateSnapshot({ now, names: names(['2026-11-25', '2026-11-26']) })).toBe(false)
  })

  it('skips when the last snapshot is under 24 hours old', () => {
    const lastSnapshotAt = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString()

    expect(shouldCreateSnapshot({ now, names: names(['2026-11-25']), lastSnapshotAt })).toBe(false)
  })

  it('creates when the last snapshot is older than a day', () => {
    const lastSnapshotAt = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString()

    expect(shouldCreateSnapshot({ now, names: names(['2026-11-25']), lastSnapshotAt })).toBe(true)
  })

  it('ignores an unreadable timestamp', () => {
    expect(
      shouldCreateSnapshot({ now, names: names(['2026-11-25']), lastSnapshotAt: 'not-a-date' }),
    ).toBe(true)
  })
})
