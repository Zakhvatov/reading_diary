import { BookOpen } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/components/ui/ScreenHeader'

export function NotFoundScreen() {
  return (
    <div className="pad-x flex min-h-[100dvh] flex-col justify-center pb-24">
      <ScreenHeader title="Страница не найдена" caption="404" />
      <p className="mt-4 text-muted">Похоже, ссылка устарела или в адресе опечатка.</p>
      <div className="mt-8 flex flex-col gap-3">
        <Button to="/home">На главную</Button>
        <Button to="/add" variant="outline">
          <BookOpen size={20} aria-hidden />
          Добавить книгу
        </Button>
      </div>
    </div>
  )
}
