import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/components/ui/ScreenHeader'

export function RouteError() {
  const error = useRouteError()
  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'Экран не загрузился'

  return (
    <div className="pad-x flex min-h-[100dvh] flex-col justify-center pb-24">
      <ScreenHeader title="Что-то пошло не так" caption="Ошибка" />
      <p className="mt-4 text-muted">{detail}. Данные не пострадали.</p>
      <div className="mt-8 flex flex-col gap-3">
        <Button onClick={() => window.location.reload()}>Обновить</Button>
        <Button to="/home" variant="outline">
          На главную
        </Button>
      </div>
    </div>
  )
}
