import type { ReactNode } from 'react'

type ProgressRingProps = {
  /** Прогресс 0…1, значения вне диапазона обрезаются. */
  value: number
  ariaLabel: string
  size?: number
  strokeWidth?: number
  children?: ReactNode
  className?: string
}

export function ProgressRing({
  value,
  ariaLabel,
  size = 168,
  strokeWidth = 10,
  children,
  className,
}: ProgressRingProps) {
  const progress = Math.min(Math.max(value, 0), 1)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  return (
    <div
      className={['relative inline-flex items-center justify-center', className]
        .filter(Boolean)
        .join(' ')}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={ariaLabel}
        className="-rotate-90"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          stroke="var(--line)"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          stroke="var(--accent)"
        />
      </svg>
      {children ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
      ) : null}
    </div>
  )
}
