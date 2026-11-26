export type MetadataSource = 'openlibrary' | 'googlebooks'

export const METADATA_SOURCE_LABELS: Record<MetadataSource, string> = {
  openlibrary: 'Open Library',
  googlebooks: 'Google Books',
}

export type BookDraft = {
  source: MetadataSource
  sourceId: string
  title: string
  authors: string[]
  isbn13?: string
  pageCount?: number
  publishedYear?: number
  publisher?: string
  language?: string
  genres: string[]
  description?: string
  coverUrl?: string
}
