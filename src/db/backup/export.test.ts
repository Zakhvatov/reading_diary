import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db'
import { createBookLink } from '../repositories/bookLinks'
import { createBookNote } from '../repositories/bookNotes'
import { createBook } from '../repositories/books'
import { createCharacter } from '../repositories/characters'
import { saveCover } from '../repositories/covers'
import { createJournal } from '../repositories/journals'
import { createQuote } from '../repositories/quotes'
import { getSettings } from '../repositories/settings'
import { exportBackupJson, exportBackupZip } from './export'
import { importBackup, readBackup } from './import'

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

  it('exports and restores deep diary tables', async () => {
    const book = await createBook({ title: 'Дневник' })
    const character = await createCharacter({ bookId: book.id, name: 'Герой', note: 'Жив' })
    const note = await createBookNote({ bookId: book.id, kind: 'plot', body: 'Завязка' })
    const link = await createBookLink({
      bookId: book.id,
      targetTitle: 'Другая книга',
      kind: 'similar',
    })
    const quote = await createQuote({ bookId: book.id, text: 'Цитата' })
    const journal = await createJournal({
      title: 'Мысль',
      body: '',
      color: 'pine',
      entryDate: '2026-02-01',
      photoIds: ['photo-1', 'photo-2'],
      stickers: [
        { id: 'sticker-1', sticker: 'heart', x: 0.4, y: 0.2, rotate: -10 },
        { id: 'sticker-2', sticker: 'star', x: 0.6, y: 0.3, rotate: 8 },
      ],
    })

    const file = await exportBackupJson()
    const parsed = await readBackup(file)

    expect(parsed.manifest.counts).toMatchObject({
      characters: 1,
      bookNotes: 1,
      bookLinks: 1,
    })
    expect(parsed.data.characters).toHaveLength(1)
    expect(parsed.data.bookNotes).toHaveLength(1)
    expect(parsed.data.bookLinks).toHaveLength(1)

    await db.delete()
    await db.open()
    await importBackup(file, 'replace')

    expect(await db.characters.get(character.id)).toMatchObject({ name: 'Герой', note: 'Жив' })
    expect(await db.bookNotes.get(note.id)).toMatchObject({ kind: 'plot', body: 'Завязка' })
    expect(await db.bookLinks.get(link.id)).toMatchObject({
      targetTitle: 'Другая книга',
      kind: 'similar',
    })
    expect(await db.quotes.get(quote.id)).toMatchObject({ favorite: false, shareable: false })
    expect(await db.journals.get(journal.id)).toMatchObject({
      tags: [],
      shareable: false,
      photoIds: ['photo-1', 'photo-2'],
      stickers: [
        { id: 'sticker-1', sticker: 'heart', x: 0.4, y: 0.2, rotate: -10 },
        { id: 'sticker-2', sticker: 'star', x: 0.6, y: 0.3, rotate: 8 },
      ],
    })
  })

  it('exports and restores reading history', async () => {
    await createBook({ title: 'Книга', status: 'reading' })

    const file = await exportBackupJson()
    const backup = await readBackup(file)
    expect(backup.manifest.counts.readings).toBe(1)
    expect(backup.data.readings).toHaveLength(1)

    await db.readings.clear()
    await importBackup(file, 'replace')

    expect(await db.readings.count()).toBe(1)
  })
})
