import { CaretRight } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { ScreenHeader } from '@/components/ui/ScreenHeader'

const rows = [
  {
    to: '/settings/backup',
    title: 'Резервная копия',
    description: 'Экспорт и импорт файла',
  },
  {
    to: '/about',
    title: 'О приложении',
    description: 'Версия и данные',
  },
]

export function SettingsScreen() {
  return (
    <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
      <ScreenHeader title="Настройки" caption="Приложение" />

      <nav className="mt-8 overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
        {rows.map((row) => (
          <Link
            key={row.to}
            to={row.to}
            className="flex min-h-[60px] items-center justify-between gap-4 border-b border-line px-5 py-3 last:border-b-0 active:bg-accent-soft"
          >
            <span>
              <span className="block text-[16px] leading-[22px]">{row.title}</span>
              <span className="block text-[13px] leading-[18px] text-muted">{row.description}</span>
            </span>
            <CaretRight size={18} className="shrink-0 text-muted" aria-hidden />
          </Link>
        ))}
      </nav>

      <p className="mt-6 text-[13px] leading-[18px] text-muted">
        Книги и заметки хранятся только в этом браузере. Очистка данных сайта удалит их без
        возможности восстановления.
      </p>

      <p className="mt-6 text-[13px] leading-[18px] text-muted">Версия {__APP_VERSION__}</p>
    </div>
  )
}
