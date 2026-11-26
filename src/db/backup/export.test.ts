import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db'
import { createBook } from '../repositories/books'
import { saveCover } from '../repositories/covers'
import { getSettings } from '../repositories/settings'
import { exportBackupJson, exportBackupZip } from './export'
import { readBackup } from './import'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterAll(() => {
  db.close()
})

describe('backup export', () => {
  it('writes manifest counts, cover metadata without blobs and lastBackupAt', async () => {
    const book = await createBook({ title: 'Обложка', pageCount: 100 })
    const blob = new Blob([new Uint8Array([9, 9])], { type: 'image/jpeg' })
    await saveCover({ ownerType: 'book', ownerId: book.id, blob, width: 600, height: 900 })

    const file = await exportBackupZip()
    const backup = await readBackup(file)

    expect(backup.manifest.format).toBe('reading-diary-backup')
    expect(backup.manifest.counts).toMatchObject({ books: 1, sessions: 0, covers: 1 })
    expect(Object.keys(backup.data.covers[0] ?? {})).not.toContain('blob')
    expect(backup.covers.size).toBe(1)
    expect((await getSettings()).lastBackupAt).toEqual(expect.any(String))
  })

  it('exports json with an empty covers array', async () => {
    await createBook({ title: 'Без обложек' })

    const file = await exportBackupJson()
    const backup = await readBackup(file)

    expect(backup.data.books).toHaveLength(1)
    expect(backup.data.covers).toEqual([])
    expect(backup.covers.size).toBe(0)
    expect((await getSettings()).lastBackupAt).toEqual(expect.any(String))
  })

  it('skips cover binaries when includeCovers is false', async () => {
    const book = await createBook({ title: 'Только метаданные' })
    const blob = new Blob([new Uint8Array([5])], { type: 'image/jpeg' })
    await saveCover({ ownerType: 'book', ownerId: book.id, blob, width: 600, height: 900 })

    const backup = await readBackup(await exportBackupZip({ includeCovers: false }))

    expect(backup.data.covers).toHaveLength(1)
    expect(backup.covers.size).toBe(0)
  })
})
