import { BookOpen, Notebook, Plus } from '@phosphor-icons/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { JournalCard } from '@/components/journal/JournalCard'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { db } from '@/db/db'
import { useJournals } from '@/db/live'
import type { Book } from '@/db/types'
import { formatDayShort, toDay } from '@/lib/dates'
import { pluralRu } from '@/lib/format'

const SKELETON_KEYS = ['a', 'b', 'c']

const CARD_TONES = [
  'bg-sage text-sage-ink',
  'bg-butter text-butter-ink',
  'bg-sky text-sky-ink',
  'bg-peach text-peach-ink',
  'bg-lilac text-lilac-ink',
  'bg-rose text-rose-ink',
]

const VIEWS: { value: 'entries' | 'books'; label: string }[] = [
  { value: 'entries', label: 'Записи' },
  { value: 'books', label: 'По книгам' },
]

type BookDiaryRow = {
  book: Book
  journals: number
  quotes: number
  insights: number
  lastActivity: string
}

function JournalSkeleton() {
  return (
    <div className="mt-6 flex flex-col gap-3" aria-hidden>
      {SKELETON_KEYS.map((key) => (
        <div key={key} className="h-32 animate-pulse rounded-[var(--radius-card)] bg-line/50" />
      ))}
    </div>
  )
}

export function JournalListScreen() {
  const journals = useJournals()
  const [view, setView] = useState<'entries' | 'books'>('entries')

  const bookRows = useLiveQuery(async () => {
    const [entries, quotes, notes, books] = await Promise.all([
      db.journals.toArray(),
      db.quotes.toArray(),
      db.bookNotes.where('kind').equals('insight').toArray(),
      db.books.toArray(),
    ])

    const booksById = new Map(books.map((book) => [book.id, book]))
    const counters = new Map<
      string,
      { journals: number; quotes: number; insights: number; lastActivity: string }
    >()

    function bump(
      bookId: string | undefined,
      field: 'journals' | 'quotes' | 'insights',
      at: string,
    ) {
      if (!bookId) return
      const counter = counters.get(bookId) ?? {
        journals: 0,
        quotes: 0,
        insights: 0,
        lastActivity: at,
      }
      counter[field] += 1
      if (at > counter.lastActivity) counter.lastActivity = at
      counters.set(bookId, counter)
    }

    for (const entry of entries) bump(entry.bookId, 'journals', entry.updatedAt)
    for (const quote of quotes) bump(quote.bookId, 'quotes', quote.updatedAt)
    for (const note of notes) bump(note.bookId, 'insights', note.updatedAt)

    return [...counters.entries()]
      .flatMap<BookDiaryRow>(([bookId, counter]) => {
        const book = booksById.get(bookId)
        return book ? [{ book, ...counter }] : []
      })
      .sort((a, b) => b.lastActivity.localeCompare(a.lastActivity))
  }, [])

  const entries = [...(journals ?? [])].sort(
    (a, b) => b.entryDate.localeCompare(a.entryDate) || b.createdAt.localeCompare(a.createdAt),
  )
  const loading = view === 'entries' ? journals === undefined : bookRows === undefined

  return (
    <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
      <ScreenHeader title="Дневник" caption={view === 'entries' ? 'Записи' : 'По книгам'} />

      <div
        className="mt-6 grid grid-cols-2 gap-1 rounded-[var(--radius-pill)] border border-line bg-surface p-1"
        role="group"
        aria-label="Вид дневника"
      >
        {VIEWS.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={view === item.value}
            onClick={() => setView(item.value)}
            className={[
              'h-11 rounded-[var(--radius-pill)] text-[14px] leading-[20px] font-medium transition-colors duration-150',
              view === item.value ? 'bg-accent text-accent-ink' : 'text-muted',
            ].join(' ')}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? <JournalSkeleton /> : null}

      {view === 'entries' && journals !== undefined ? (
        entries.length === 0 ? (
          <section className="journal-empty mt-8 rounded-[var(--radius-card)] bg-sage p-6 text-sage-ink">
            <Notebook size={28} aria-hidden />
            <h2 className="mt-4 font-display text-[22px] leading-[28px] font-medium">
              Здесь будут записи
            </h2>
            <p className="mt-2 text-[14px] leading-[21px] opacity-80">
              Мысли о книге, цитата, день чтения — с датой и цветом.
            </p>
          </section>
        ) : (
          <>
            <p className="mt-4 text-[13px] leading-[18px] text-muted">
              {entries.length} {pluralRu(entries.length, ['запись', 'записи', 'записей'])}
            </p>
            <ul className="mt-3 flex flex-col gap-3">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <JournalCard entry={entry} />
                </li>
              ))}
            </ul>
          </>
        )
      ) : null}

      {view === 'books' && bookRows !== undefined ? (
        bookRows.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={<BookOpen size={28} />}
              title="Пока нет книг с дневником"
              description="Запишите мысль, сохраните цитату или добавьте заметку к книге — она появится здесь."
              action={
                <Button variant="outline" to="/shelves">
                  К библиотеке
                </Button>
              }
              tone="sky"
            />
          </div>
        ) : (
          <>
            <p className="mt-4 text-[13px] leading-[18px] text-muted">
              {bookRows.length} {pluralRu(bookRows.length, ['книга', 'книги', 'книг'])} с дневником
            </p>
            <ul className="mt-3 flex flex-col gap-3">
              {bookRows.map((row, index) => (
                <li key={row.book.id}>
                  <Link
                    to={`/books/${row.book.id}/diary`}
                    className={`block rounded-[var(--radius-card)] p-4 ${
                      CARD_TONES[index % CARD_TONES.length] ?? ''
                    }`}
                  >
                    <time
                      dateTime={toDay(new Date(row.lastActivity))}
                      className="block text-[11px] leading-[14px] font-medium tracking-[0.08em] uppercase opacity-70"
                    >
                      {formatDayShort(toDay(new Date(row.lastActivity)))}
                    </time>
                    <h2 className="mt-1 line-clamp-2 font-display text-[20px] leading-[26px] font-medium">
                      {row.book.title}
                    </h2>
                    {row.book.authors.length > 0 ? (
                      <p className="mt-1 line-clamp-1 text-[13px] leading-[18px] opacity-80">
                        {row.book.authors.join(', ')}
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {row.journals > 0 ? (
                        <span className="rounded-[var(--radius-pill)] bg-paper/70 px-2.5 py-1 text-[12px] leading-[16px] font-medium">
                          {row.journals} {pluralRu(row.journals, ['запись', 'записи', 'записей'])}
                        </span>
                      ) : null}
                      {row.quotes > 0 ? (
                        <span className="rounded-[var(--radius-pill)] bg-paper/70 px-2.5 py-1 text-[12px] leading-[16px] font-medium">
                          {row.quotes} {pluralRu(row.quotes, ['цитата', 'цитаты', 'цитат'])}
                        </span>
                      ) : null}
                      {row.insights > 0 ? (
                        <span className="rounded-[var(--radius-pill)] bg-paper/70 px-2.5 py-1 text-[12px] leading-[16px] font-medium">
                          {row.insights} {pluralRu(row.insights, ['мысль', 'мысли', 'мыслей'])}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )
      ) : null}

      {view === 'entries' ? (
        <Link
          to="/journals/new"
          aria-label="Новая запись"
          className="fixed right-5 z-40 flex h-14 items-center gap-2 rounded-full bg-accent px-5 text-accent-ink transition-transform duration-150 active:scale-[0.96]"
          style={{ bottom: 'calc(var(--tab-h) + var(--safe-bottom) + 16px)' }}
        >
          <Plus size={22} weight="bold" aria-hidden />
          <span className="text-[15px] font-medium">Новая запись</span>
        </Link>
      ) : null}
    </div>
  )
}
