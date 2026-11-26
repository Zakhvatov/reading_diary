import { ArrowRight, GearSix } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { BookCover } from '@/components/book/BookCover'
import { BackupBanner } from '@/components/home/BackupBanner'
import { formatHomeDate, greetingFor } from '@/components/home/greeting'
import type { Book, JournalEntry } from '@/db/types'
import { formatAuthors } from '@/lib/authors'
import { formatDayShort } from '@/lib/dates'
import { pluralRu } from '@/lib/format'
import { markdownToPlainText } from '@/lib/markdown'
import { bookProgress } from '@/lib/progress'
import { useHomeBackupBanner, type HomeData } from './homeData'

function LeopardHeader() {
  const now = new Date()
  const year = now.getFullYear()

  return (
    <header className="lp-header">
      <div className="min-w-0">
        <p className="lp-masthead lp-kicker">Дневник чтения · {year}</p>
        <h1 className="lp-greeting">{greetingFor(now)}</h1>
        <p className="lp-date">{formatHomeDate(now)}</p>
      </div>

      <Link to="/settings" aria-label="Настройки" className="lp-gear mt-0.5">
        <GearSix size={20} aria-hidden />
      </Link>
    </header>
  )
}

function IssueNo() {
  const month = String(new Date().getMonth() + 1).padStart(2, '0')
  return (
    <span className="lp-hero__no" aria-hidden>
      № {month}
    </span>
  )
}

function CurrentStory({ book }: { book: Book }) {
  const progress = bookProgress(book)
  const percent = Math.round(progress * 100)

  return (
    <section className="lp-hero lp-rise" aria-labelledby="leopard-cover-story">
      <div className="lp-hero__top">
        <h2 id="leopard-cover-story" className="lp-kicker lp-kicker--lacquer">
          Обложка номера
        </h2>
        <IssueNo />
      </div>

      <div className="lp-hero__body">
        <Link to={`/books/${book.id}`} className="lp-cover-frame" aria-hidden tabIndex={-1}>
          <BookCover book={book} />
        </Link>

        <div className="lp-hero__meta">
          <p className="lp-hero__author">{formatAuthors(book.authors, true)}</p>
          {book.startedAt ? (
            <p className="lp-hero__since">с {formatDayShort(book.startedAt)}</p>
          ) : null}
          <p className="lp-hero__percent tnum">
            {percent}
            <span>%</span>
          </p>
        </div>
      </div>

      <Link to={`/books/${book.id}`} className="block">
        <p className="lp-hero__title">{book.title}</p>
        {book.subtitle ? <p className="lp-hero__subtitle">{book.subtitle}</p> : null}
      </Link>

      <div className="lp-hero__progress">
        <div
          className="lp-hero__bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <span style={{ width: `${percent}%` }} />
        </div>

        <div className="lp-hero__foot">
          <p className="lp-hero__pages tnum">
            {book.pageCount
              ? `${book.currentPage} / ${book.pageCount} стр.`
              : `${book.currentPage} стр.`}
          </p>
          <Link to={`/books/${book.id}`} className="lp-hero__cta">
            Продолжить
            <ArrowRight size={13} weight="bold" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  )
}

function QuietStory({ empty }: { empty: boolean }) {
  return (
    <section className="lp-hero lp-rise" aria-labelledby="leopard-quiet-story">
      <div className="lp-hero__top">
        <h2 id="leopard-quiet-story" className="lp-kicker lp-kicker--lacquer">
          {empty ? 'Новый выпуск' : 'Обложка номера'}
        </h2>
        <IssueNo />
      </div>

      <div className="lp-hero__body">
        <div className="lp-ghost-cover" aria-hidden />
        <div className="lp-hero__meta">
          <p className="lp-hero__author">{empty ? 'Первый номер' : 'Пауза между главами'}</p>
          <p className="lp-hero__since">
            {empty ? 'здесь появится ваша книга' : 'полка ждёт следующую историю'}
          </p>
        </div>
      </div>

      <p className="lp-hero__title">
        {empty ? 'Обложка ещё не выбрана' : 'Сейчас ничего не читается'}
      </p>
      <p className="lp-hero__text">
        {empty
          ? 'Добавьте первую книгу — прогресс, сессии и заметки соберутся в номер.'
          : 'Выберите книгу на полке или начните новую — обложка номера обновится.'}
      </p>

      <div className="lp-hero__foot">
        <Link to={empty ? '/add' : '/shelves'} className="lp-hero__cta">
          {empty ? 'Добавить книгу' : 'Открыть библиотеку'}
          <ArrowRight size={13} weight="bold" aria-hidden />
        </Link>
      </div>
    </section>
  )
}

function IndexSection({ data }: { data: HomeData }) {
  const streak = data.streak
  const days = streak?.last7 ?? []
  const goal = data.settings?.dailyGoalMinutes ?? 0
  const sessionCount = data.sessions?.length ?? 0

  return (
    <section className="lp-section" aria-labelledby="leopard-index">
      <div className="lp-section__head">
        <h2 id="leopard-index" className="lp-kicker">
          Индекс чтения
        </h2>
        <Link to="/stats" className="lp-section__link">
          Статистика
          <ArrowRight size={11} weight="bold" aria-hidden />
        </Link>
      </div>

      <div className="lp-index">
        <div className="lp-index__lead">
          <p className="lp-index__value tnum">{data.minutes}</p>
          <p className="lp-index__unit">
            {goal > 0 ? `минут из ${goal} сегодня` : 'минут сегодня'}
          </p>
          {sessionCount > 0 ? (
            <p className="lp-index__note">
              {sessionCount} {pluralRu(sessionCount, ['сессия', 'сессии', 'сессий'])}
            </p>
          ) : null}
        </div>

        <dl className="lp-index__rows">
          <div className="lp-index__row">
            <dt>страницы</dt>
            <dd className="tnum">{data.pages}</dd>
          </div>
          <div className="lp-index__row">
            <dt>книги за год</dt>
            <dd className="tnum">{data.finishedThisYear}</dd>
          </div>
        </dl>
      </div>

      <div className="lp-streak">
        <p className="lp-streak__label">
          <span className="lp-streak__num tnum">{streak?.current ?? 0}</span>
          {pluralRu(streak?.current ?? 0, ['день', 'дня', 'дней'])} подряд
        </p>

        <ol
          className="lp-streak__days"
          aria-label={
            streak
              ? `Серия ${streak.current}, последние семь дней`
              : 'Серия чтения, последние семь дней'
          }
        >
          {days.map(({ day, active }, index) => {
            const isToday = index === days.length - 1
            return (
              <li
                key={day}
                className={active ? 'is-on' : undefined}
                aria-hidden
                title={`${formatDayShort(day)}${isToday ? ' · сегодня' : ''}: ${
                  active ? 'чтение было' : 'чтения не было'
                }`}
              />
            )
          })}
        </ol>
      </div>
    </section>
  )
}

function Lookbook({ books }: { books: Book[] }) {
  if (books.length === 0) return null

  return (
    <section className="lp-section" aria-labelledby="leopard-lookbook">
      <div className="lp-section__head">
        <h2 id="leopard-lookbook" className="lp-kicker">
          Лукбук · архив
        </h2>
        <Link to="/shelves/finished" className="lp-section__link">
          Все обложки
          <ArrowRight size={11} weight="bold" aria-hidden />
        </Link>
      </div>

      <div className="lp-bleed">
        <div className="lp-lookbook">
          {books.map((book, index) => (
            <Link key={book.id} to={`/books/${book.id}`} className="lp-look">
              <p className="lp-look__no" aria-hidden>
                {String(index + 1).padStart(2, '0')}
              </p>
              <div className="lp-look__frame">
                <BookCover book={book} />
              </div>
              <p className="lp-look__title">{book.title}</p>
              {book.finishedAt ? (
                <p className="lp-look__date">{formatDayShort(book.finishedAt)}</p>
              ) : null}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function JournalNote({ entry, loading }: { entry: JournalEntry | undefined; loading: boolean }) {
  if (loading) {
    return (
      <section className="lp-section" aria-labelledby="leopard-note">
        <div className="lp-section__head">
          <h2 id="leopard-note" className="lp-kicker">
            Из дневника
          </h2>
        </div>
        <div className="lp-skeleton mt-4 h-[148px]" />
      </section>
    )
  }

  if (!entry) {
    return (
      <section className="lp-section" aria-labelledby="leopard-note">
        <div className="lp-section__head">
          <h2 id="leopard-note" className="lp-kicker">
            Из дневника
          </h2>
          <Link to="/journals" className="lp-section__link">
            Все записи
            <ArrowRight size={11} weight="bold" aria-hidden />
          </Link>
        </div>

        <Link to="/journals/new" className="lp-note lp-note--empty">
          <p className="lp-kicker lp-note__kicker">Свободная страница</p>
          <p className="lp-quote">«Место для первой мысли о книге»</p>
          <div className="lp-note__footer">
            <p className="lp-note__title">Дневник</p>
            <p className="lp-note__more">
              Записать
              <ArrowRight size={11} weight="bold" aria-hidden />
            </p>
          </div>
        </Link>
      </section>
    )
  }

  const preview = markdownToPlainText(entry.body).trim()
  const excerpt = preview || entry.title

  return (
    <section className="lp-section" aria-labelledby="leopard-note">
      <div className="lp-section__head">
        <h2 id="leopard-note" className="lp-kicker">
          Из дневника
        </h2>
        <Link to="/journals" className="lp-section__link">
          Все записи
          <ArrowRight size={11} weight="bold" aria-hidden />
        </Link>
      </div>

      <Link to={`/journals/${entry.id}`} className="lp-note">
        <p className="lp-kicker lp-note__kicker">{formatDayShort(entry.entryDate)}</p>
        <blockquote className="lp-quote">«{excerpt}»</blockquote>

        <div className="lp-note__footer">
          <p className="lp-note__title">{entry.title || 'Без названия'}</p>
          <p className="lp-note__more">
            Читать
            <ArrowRight size={11} weight="bold" aria-hidden />
          </p>
        </div>
      </Link>
    </section>
  )
}

function LoadingStory() {
  return (
    <>
      <section className="lp-hero lp-rise" aria-label="Загрузка выпуска">
        <div className="lp-hero__top">
          <p className="lp-kicker lp-kicker--lacquer">Обложка номера</p>
          <IssueNo />
        </div>
        <p className="lp-loading-text">Готовим свежий номер…</p>
        <div className="lp-loading-line" aria-hidden />
        <div className="mt-5 flex gap-3" aria-hidden>
          <div className="lp-skeleton h-24 w-[78px] shrink-0" />
          <div className="flex-1 space-y-2.5 pt-1">
            <div className="lp-skeleton h-2.5 w-1/2" />
            <div className="lp-skeleton h-2.5 w-3/4" />
            <div className="lp-skeleton h-2.5 w-2/5" />
          </div>
        </div>
      </section>

      <section className="lp-section" aria-hidden>
        <div className="lp-section__head">
          <div className="lp-skeleton h-2.5 w-24" />
        </div>
        <div className="lp-skeleton mt-4 h-[92px]" />
      </section>
    </>
  )
}

export function LeopardHome({ data }: { data: HomeData }) {
  const banner = useHomeBackupBanner(data.backupStale)
  const empty = data.books !== undefined && data.books.length === 0

  return (
    <div className="pad-x mx-auto max-w-xl pt-[calc(var(--safe-top)+18px)]">
      <LeopardHeader />

      {banner.show ? <BackupBanner onDismiss={banner.dismiss} /> : null}

      {data.loading ? (
        <LoadingStory />
      ) : (
        <>
          {data.current ? <CurrentStory book={data.current} /> : <QuietStory empty={empty} />}

          {empty ? null : (
            <>
              <IndexSection data={data} />
              <Lookbook books={data.recent} />
            </>
          )}

          <JournalNote entry={data.journals?.[0]} loading={data.journals === undefined} />
        </>
      )}

      <p className="lp-foot">Данные остаются в этом браузере</p>
    </div>
  )
}
