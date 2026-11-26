import { BookOpen, MagnifyingGlass } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { lookupIsbn, searchBooks } from '@/db/metadata'
import { METADATA_SOURCE_LABELS, type BookDraft } from '@/db/metadata/types'
import { formatAuthors } from '@/lib/authors'

type BookSearchPanelProps = {
  initialIsbn?: string
  onSelect: (draft: BookDraft) => void
  onManual: (prefill: string) => void
}

type ResultState = {
  key: string
  drafts: BookDraft[]
  error: string | null
}

function useDebouncedValue(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])

  return debounced
}

export function BookSearchPanel({ initialIsbn, onSelect, onManual }: BookSearchPanelProps) {
  const [query, setQuery] = useState('')
  const [isbnRequest, setIsbnRequest] = useState(initialIsbn ?? '')
  const debounced = useDebouncedValue(query.trim(), 400)

  const key = isbnRequest ? `isbn:${isbnRequest}` : debounced.length >= 2 ? debounced : ''

  const [state, setState] = useState<ResultState>({ key: '', drafts: [], error: null })
  const loading = key !== '' && state.key !== key

  useEffect(() => {
    if (!key) return

    const controller = new AbortController()
    const request = key.startsWith('isbn:')
      ? lookupIsbn(key.slice(5), controller.signal)
      : searchBooks(key, controller.signal)

    request
      .then((drafts) => {
        setState({
          key,
          drafts,
          error: drafts.length > 0 ? null : 'Ничего не найдено',
        })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return

        const message = error instanceof Error ? error.message : 'Не удалось выполнить поиск'
        setState({
          key,
          drafts: [],
          error: navigator.onLine ? message : 'Нет сети — добавьте книгу вручную',
        })
      })

    return () => controller.abort()
  }, [key])

  function handleQuery(value: string) {
    setQuery(value)
    if (isbnRequest && value.trim().length >= 2) {
      setIsbnRequest('')
    }
  }

  const showResults = key !== '' && !loading && state.key === key && state.drafts.length > 0
  const showMessage = key !== '' && !loading && state.key === key && state.drafts.length === 0

  return (
    <div className="mt-6">
      <div className="relative">
        <MagnifyingGlass
          size={18}
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          name="book-search"
          value={query}
          onChange={(event) => handleQuery(event.target.value)}
          aria-label="Поиск книги"
          placeholder="Название, автор или ISBN"
          className="h-12 w-full rounded-[var(--radius-pill)] border border-line bg-surface pr-4 pl-11 text-[16px] text-ink placeholder:text-muted focus-visible:border-accent focus-visible:outline-none"
        />
      </div>

      {isbnRequest ? (
        <p className="mt-3 text-[13px] leading-[18px] text-muted">Ищем по ISBN {isbnRequest}</p>
      ) : null}

      {loading ? (
        <div className="mt-5 space-y-3" aria-hidden>
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="flex animate-pulse gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-3"
            >
              <div className="h-[72px] w-12 shrink-0 rounded-[6px] bg-line/60" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 w-3/4 rounded bg-line/60" />
                <div className="h-3 w-1/2 rounded bg-line/60" />
                <div className="h-3 w-1/3 rounded bg-line/60" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {showResults ? (
        <div className="mt-5 space-y-3">
          {state.drafts.map((draft) => (
            <button
              key={`${draft.source}:${draft.sourceId}`}
              type="button"
              onClick={() => onSelect(draft)}
              className="flex w-full gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-3 text-left active:bg-accent-soft/40"
            >
              <div className="flex h-[72px] w-12 shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-line/60">
                {draft.coverUrl ? (
                  <img
                    src={draft.coverUrl}
                    alt=""
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none'
                    }}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <BookOpen size={20} className="text-muted" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-display text-[16px] leading-[21px] font-medium">
                  {draft.title}
                </p>
                <p className="mt-0.5 line-clamp-1 text-[13px] leading-[18px] text-muted">
                  {formatAuthors(draft.authors, true)}
                </p>
                <p className="mt-1 text-[12px] leading-[16px] text-muted">
                  {[
                    draft.publishedYear?.toString() ?? '',
                    draft.pageCount ? `${draft.pageCount} стр.` : '',
                    METADATA_SOURCE_LABELS[draft.source],
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : null}

      {showMessage ? (
        <div className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <p className="font-display text-[18px] leading-[24px] font-medium">
            {state.error ?? 'Ничего не найдено'}
          </p>
          <p className="mt-2 text-[14px] leading-[20px] text-muted">
            Можно добавить книгу вручную — данные останутся только у вас.
          </p>
          <Button
            variant="outline"
            className="mt-4 w-full"
            onClick={() => onManual(query || isbnRequest)}
          >
            Добавить вручную
          </Button>
        </div>
      ) : null}

      {!key ? (
        <p className="mt-4 text-[13px] leading-[18px] text-muted">
          Введите хотя бы два символа. Поиск идёт по Open Library, при неудаче — по Google Books.
        </p>
      ) : null}
    </div>
  )
}
