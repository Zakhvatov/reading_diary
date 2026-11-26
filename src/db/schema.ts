import { z } from 'zod'

const idSchema = z.string().min(1)
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const isoDateTimeSchema = z.string().min(1)
const ratingSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])

export const bookStatusSchema = z.enum(['want', 'reading', 'finished', 'dnf'])
export const progressModeSchema = z.enum(['pages', 'percent'])
export const journalColorSchema = z.enum(['pine', 'amber', 'clay', 'sky', 'plum', 'moss'])
export const sessionKindSchema = z.enum(['timer', 'manual'])
export const readingStatusSchema = z.enum(['reading', 'finished', 'dnf'])
export const entityKindSchema = z.enum(['book', 'reading', 'session', 'quote', 'journal', 'goal'])

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
  note: z.string().optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
})

export const journalEntrySchema = z.object({
  id: idSchema,
  bookId: idSchema.optional(),
  title: z.string(),
  body: z.string(),
  color: journalColorSchema,
  photoId: idSchema.optional(),
  entryDate: isoDateSchema,
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

export const settingsSchema = z.object({
  id: z.literal('app'),
  onboardingDone: z.boolean(),
  defaultStatus: bookStatusSchema,
  dailyGoalMinutes: z.number().int().nonnegative(),
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
