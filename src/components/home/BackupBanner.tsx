import { CloudWarning, X } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'

type BackupBannerProps = {
  onDismiss: () => void
}

export function BackupBanner({ onDismiss }: BackupBannerProps) {
  return (
    <section className="mt-5 flex items-start gap-3 rounded-[var(--radius-card)] bg-butter p-4 text-butter-ink">
      <CloudWarning size={22} aria-hidden className="mt-0.5 shrink-0" />

      <div className="min-w-0 flex-1">
        <h2 className="text-[15px] leading-[20px] font-medium">Бэкап старше 7 дней</h2>
        <p className="mt-1 text-[13px] leading-[18px] opacity-80">
          Экспортируйте файл, чтобы не потерять книги и записи.
        </p>
        <Link
          to="/settings/backup"
          className="mt-1 inline-flex min-h-11 items-center text-[14px] leading-[20px] font-medium underline underline-offset-4"
        >
          Сделать бэкап
        </Link>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Скрыть напоминание о бэкапе"
        className="-mt-1 -mr-1 flex size-11 shrink-0 items-center justify-center rounded-full active:bg-butter-ink/10"
      >
        <X size={18} aria-hidden />
      </button>
    </section>
  )
}
