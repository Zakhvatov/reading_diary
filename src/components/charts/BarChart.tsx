export type BarChartPoint = {
  label: string
  value: number
}

type BarChartProps = {
  points: BarChartPoint[]
  ariaLabel: string
  className?: string
}

const WIDTH = 340
const HEIGHT = 132
const PADDING = { top: 8, right: 2, bottom: 20, left: 2 }
const INNER_WIDTH = WIDTH - PADDING.left - PADDING.right
const INNER_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom

function labelIndexes(count: number): Set<number> {
  if (count <= 10) return new Set(Array.from({ length: count }, (_, index) => index))

  const step = Math.ceil(count / 6)
  const indexes = new Set<number>()
  for (let index = 0; index < count; index += step) indexes.add(index)
  indexes.add(count - 1)
  return indexes
}

export function BarChart({ points, ariaLabel, className }: BarChartProps) {
  const max = Math.max(...points.map((point) => point.value), 1)
  const slot = points.length > 0 ? INNER_WIDTH / points.length : INNER_WIDTH
  const barWidth = Math.max(2, slot * 0.6)
  const labels = labelIndexes(points.length)

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={['h-auto w-full', className].filter(Boolean).join(' ')}
      role="img"
      aria-label={ariaLabel}
    >
      <line
        x1={PADDING.left}
        x2={WIDTH - PADDING.right}
        y1={PADDING.top + INNER_HEIGHT}
        y2={PADDING.top + INNER_HEIGHT}
        stroke="var(--line)"
        strokeWidth={1}
      />
      {points.map((point, index) => {
        const height = point.value > 0 ? Math.max(2, (point.value / max) * INNER_HEIGHT) : 0
        const x = PADDING.left + index * slot + (slot - barWidth) / 2
        const y = PADDING.top + INNER_HEIGHT - height

        return (
          <g key={index}>
            {height > 0 ? (
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={height}
                rx={Math.min(2, barWidth / 2)}
                fill="var(--accent)"
              />
            ) : null}
            {labels.has(index) ? (
              <text
                x={x + barWidth / 2}
                y={HEIGHT - 4}
                textAnchor="middle"
                className="text-[9px]"
                fill="var(--muted)"
              >
                {point.label}
              </text>
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}
