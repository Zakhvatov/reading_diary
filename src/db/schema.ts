import { z } from 'zod'
import { BOARD_NOTE_COLORS, BOARD_NOTE_MAX_LENGTH, MAX_BOARD_NOTES } from '@/lib/board'
import { MAX_JOURNAL_PHOTOS } from '@/lib/journal'

const idSchema = z.string().min(1)
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const isoDateTimeSchema = z.string().min(1)
const ratingSchema = z.number().min(0).max(10)

export const bookStatusSchema = z.enum(['want', 'reading', 'finished', 'dnf', 'rereading'])
export const progressModeSchema = z.enum(['pages', 'percent'])
export const ratingScaleSchema = z.enum(['stars5', 'score10', 'emotion'])
export const emotionRatingSchema = z.enum(['love', 'neutral', 'mindblown'])
export const bookFormatSchema = z.enum(['paper', 'ebook', 'audio'])
export const acquisitionSchema = z.enum(['bought', 'library', 'gift', 'other'])
export const colorLabelSchema = z.enum(['red', 'amber', 'green', 'blue', 'none'])
export const diaryTemplateIdSchema = z.enum(['lite', 'analyst', 'bookclub'])
export const journalColorSchema = z.enum(['pine', 'amber', 'clay', 'sky', 'plum', 'moss'])
export const boardNoteColorSchema = z.enum(BOARD_NOTE_COLORS)
export const boardNoteSchema = z.object({
  id: idSchema,
  color: boardNoteColorSchema,
  text: z.string().max(BOARD_NOTE_MAX_LENGTH),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
})
export const sessionKindSchema = z.enum(['timer', 'manual'])
export const readingStatusSchema = z.enum(['reading', 'finished', 'dnf'])
export const bookNoteKindSchema = z.enum(['plot', 'insight'])
export const bookLinkKindSchema = z.enum(['similar', 'sequel', 'prequel', 'same-world', 'other'])
export const entityKindSchema = z.enum([
  'book',
  'reading',
  'session',
  'quote',
  'journal',
  'goal',
  'character',
  'bookNote',
  'bookLink',
])

export const bookSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  subtitle: z.string().optional(),
  authors: z.array(z.string()),
  isbn13: z.string().optional(),
  isbn10: z.string().optional(),
  publisher: z.string().optional(),
  publishedYear: z.number().int().optional(),
  pageCount: z.number().int().positive().optional(),
  language: z.string().optional(),
  genres: z.array(z.string()),
  description: z.string().optional(),
  status: bookStatusSchema,
  progressMode: progressModeSchema,
  currentPage: z.number().int().nonnegative(),
  percent: z.number().min(0).max(100),
  rating: ratingSchema.optional(),
  ratingScale: ratingScaleSchema,
  emotion: emotionRatingSchema.optional(),
  tags: z.array(z.string()),
  moods: z.array(z.string()),
  format: bookFormatSchema.optional(),
  acquisition: acquisitionSchema.optional(),
  colorLabel: colorLabelSchema,
  diaryTemplate: diaryTemplateIdSchema,
  shareable: z.boolean(),
  startedAt: isoDateSchema.optional(),
  finishedAt: isoDateSchema.optional(),
  coverId: idSchema.optional(),
  totalReadingMs: z.number().nonnegative(),
  sessionCount: z.number().int().nonnegative(),
  pagesReadTotal: z.number().int().nonnegative(),
  metadataSource: z.enum(['openlibrary', 'googlebooks', 'manual']).optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
})

export const readingSchema = z.object({
  id: idSchema,
  bookId: idSchema,
  status: readingStatusSchema,
  startedAt: isoDateSchema.optional(),
  finishedAt: isoDateSchema.optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
})

export const sessionSchema = z.object({
  id: idSchema,
  bookId: idSchema,
  day: isoDateSchema,
  startedAt: isoDateTimeSchema,
  endedAt: isoDateTimeSchema,
  durationMs: z.number().int().nonnegative(),
  pagesRead: z.number().int().nonnegative(),
  startPage: z.number().int().nonnegative().optional(),
  endPage: z.number().int().nonnegative().optional(),
  kind: sessionKindSchema,
  note: z.string().optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
})

export const quoteSchema = z.object({
  id: idSchema,
  bookId: idSchema,
  text: z.string().min(1),
  page: z.number().int().nonnegative().optional(),
  chapter: z.string().optional(),
  note: z.string().optional(),
  favorite: z.boolean(),
  shareable: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
})

export const journalEntrySchema = z.object({
  id: idSchema,
  bookId: idSchema.optional(),
  title: z.string(),
  body: z.string(),
  color: journalColorSchema,
  photoIds: z.array(idSchema).max(MAX_JOURNAL_PHOTOS),
  board: z.array(boardNoteSchema).max(MAX_BOARD_NOTES),
  entryDate: isoDateSchema,
  tags: z.array(z.string()),
  mood: z.string().optional(),
  shareable: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
})

export const characterSchema = z.object({
  id: idSchema,
  bookId: idSchema,
  name: z.string().min(1),
  role: z.string().optional(),
  note: z.string(),
  spoiler: z.boolean().optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
})

export const bookNoteSchema = z.object({
  id: idSchema,
  bookId: idSchema,
  kind: bookNoteKindSchema,
  title: z.string().optional(),
  chapter: z.string().optional(),
  body: z.string(),
  tags: z.array(z.string()),
  order: z.number().int(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
})

export const bookLinkSchema = z.object({
  id: idSchema,
  bookId: idSchema,
  targetBookId: idSchema.optional(),
  targetTitle: z.string().min(1),
  kind: bookLinkKindSchema,
  note: z.string().optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
})

export const goalSchema = z.object({
  id: idSchema,
  year: z.number().int().min(1900).max(2200),
  targetBooks: z.number().int().positive(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
})

export const themeIdSchema = z.enum(['shelf', 'diary', 'leopard'])
export const themeModeSchema = z.enum(['light', 'dark', 'system'])

export const settingsSchema = z.object({
  id: z.literal('app'),
  onboardingDone: z.boolean(),
  defaultStatus: bookStatusSchema,
  defaultTemplate: diaryTemplateIdSchema,
  defaultRatingScale: ratingScaleSchema,
  dailyGoalMinutes: z.number().int().nonnegative(),
  theme: themeIdSchema.default('shelf'),
  themeMode: themeModeSchema.default('light'),
  lastBackupAt: isoDateTimeSchema.optional(),
  lastSnapshotAt: isoDateTimeSchema.optional(),
  persistGranted: z.boolean(),
  schemaVersion: z.number().int().positive(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
})

export const tombstoneSchema = z.object({
  id: idSchema,
  entity: entityKindSchema,
  entityId: idSchema,
  deletedAt: isoDateTimeSchema,
})

export const coverMetaSchema = z.object({
  id: idSchema,
  ownerType: z.enum(['book', 'journal']),
  ownerId: idSchema,
  mime: z.literal('image/jpeg'),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sourceUrl: z.string().optional(),
  createdAt: isoDateTimeSchema,
})

export const backupDataSchema = z.object({
  books: z.array(bookSchema),
  readings: z.array(readingSchema).default([]),
  sessions: z.array(sessionSchema),
  quotes: z.array(quoteSchema),
  journals: z.array(journalEntrySchema),
  characters: z.array(characterSchema).default([]),
  bookNotes: z.array(bookNoteSchema).default([]),
  bookLinks: z.array(bookLinkSchema).default([]),
  goals: z.array(goalSchema),
  settings: z.array(settingsSchema),
  tombstones: z.array(tombstoneSchema),
  covers: z.array(coverMetaSchema).default([]),
})

export const backupManifestSchema = z.object({
  format: z.literal('reading-diary-backup'),
  schemaVersion: z.number().int().positive(),
  exportedAt: isoDateTimeSchema,
  appVersion: z.string(),
  counts: z.record(z.string(), z.number().int().nonnegative()),
})

export type BackupData = z.infer<typeof backupDataSchema>
export type BackupManifest = z.infer<typeof backupManifestSchema>
export type CoverMeta = z.infer<typeof coverMetaSchema>
