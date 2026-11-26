import type { ReactNode } from 'react'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/components/ui/ScreenHeader'

type PlaceholderScreenProps = {
  title: string
  caption: string
  icon: ReactNode
  description: string
  back?: boolean
}

export function PlaceholderScreen({
  title,
  caption,
  icon,
  description,
  back = false,
}: PlaceholderScreenProps) {
  return (
    <div className="pad-x pt-[calc(var(--safe-top)+20px)]">
      <ScreenHeader title={title} caption={caption} back={back} />
      <div className="mt-8">
        <EmptyState icon={icon} title="Пока пусто" description={description} />
      </div>
    </div>
  )
}
