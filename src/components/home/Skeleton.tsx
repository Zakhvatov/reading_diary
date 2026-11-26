type SkeletonProps = {
  className: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={['animate-pulse rounded-[var(--radius-card)] bg-line/50', className].join(' ')}
    />
  )
}
