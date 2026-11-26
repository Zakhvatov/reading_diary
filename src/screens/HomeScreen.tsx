import { BookOpen } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/components/ui/ScreenHeader'

function formatToday(): string {
  const formatted = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

export function HomeScreen() {
  return (
    <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
      <ScreenHeader title="Сегодня" caption={formatToday()} />

      <div className="mt-8">
        <EmptyState
          icon={<BookOpen size={28} />}
          title="Полка пока пуста"
          description="Добавьте первую книгу — прогресс, сессии и заметки появятся здесь."
          action={<Button to="/add">Добавить книгу</Button>}
        />
      </div>

      <p className="mt-8 text-[13px] leading-[18px] text-muted">
        Данные хранятся только в этом браузере.
      </p>
    </div>
  )
}
