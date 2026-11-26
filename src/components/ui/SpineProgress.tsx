type SpineProgressProps = {
  value: number
  className?: string
}

export function SpineProgress({ value, className }: SpineProgressProps) {
  const percent = Math.round(Math.min(Math.max(value, 0), 1) * 100)

  return (
    <div
      className={['h-[3px] overflow-hidden rounded-full bg-line', className]
        .filter(Boolean)
        .join(' ')}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
    </div>
  )
}
