export function formatAuthors(authors: string[], short = false): string {
  if (authors.length === 0) {
    return 'Автор не указан'
  }

  if (!short || authors.length === 1) {
    return authors.join(', ')
  }

  return `${authors[0]} и др.`
}
