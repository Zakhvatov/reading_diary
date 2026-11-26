import { addDays, endOfWeek, startOfWeek } from 'date-fns'
import { parseDay, toDay } from '@/lib/dates'
import type { ISODate } from '@/db/types'

export type HeatmapDay = {
  day: ISODate
  minutes: number
}

type HeatmapProps = {
  days: HeatmapDay[]
  start: ISODate
  end: ISODate
  ariaLabel: string
  className?: string
}

const CELL = 7
const GAP = 1.5
const STEP = CELL + GAP
const LEGEND_OPACITY = [0.25, 0.45, 0.7, 1]

type Cell = { day: ISODate; minutes: number; column: number; row: number }

function levelOpacity(minutes: number, max: number): number {
  if (minutes <= 0) return 0
  const ratio = minutes / max
  if (ratio <= 0.25) return 0.25
  if (ratio <= 0.5) return 0.45
  if (ratio <= 0.75) return 0.7
  return 1
}

function buildCells(days: HeatmapDay[], start: ISODate, end: ISODate): Cell[] {
  const minutesByDay = new Map(days.map((entry) => [entry.day, entry.minutes]))
  const gridStart = startOfWeek(parseDay(start), { weekStartsOn: 1 })
  const gridEnd = endOfWeek(parseDay(end), { weekStartsOn: 1 })
  const cells: Cell[] = []

  let cursor = gridStart
  let index = 0
  while (cursor <= gridEnd) {
    const day = toDay(cursor)
    if (day >= start && day <= end) {
      cells.push({
        day,
        minutes: minutesByDay.get(day) ?? 0,
        column: Math.floor(index / 7),
        row: index % 7,
      })
    }
    cursor = addDays(cursor, 1)
    index += 1
  }

  return cells
}

export function Heatmap({ days, start, end, ariaLabel, className }: HeatmapProps) {
  const cells = buildCells(days, start, end)
  const columns = cells.reduce((max, cell) => Math.max(max, cell.column + 1), 1)
  const max = Math.max(...days.map((entry) => entry.minutes), 1)
  const width = columns * STEP - GAP
  const height = 7 * STEP - GAP

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={ariaLabel}
      >
        {cells.map((cell) => {
          const opacity = levelOpacity(cell.minutes, max)
          return (
            <rect
              key={cell.day}
              x={cell.column * STEP}
              y={cell.row * STEP}
              width={CELL}
              height={CELL}
              rx={1.5}
              fill={opacity > 0 ? 'var(--accent)' : 'var(--line)'}
              fillOpacity={opacity > 0 ? opacity : 0.7}
            />
          )
        })}
      </svg>
      <div className="mt-2 flex items-center justify-end gap-1.5" aria-hidden>
        <span className="text-[11px] leading-[14px] text-muted">меньше</span>
        {LEGEND_OPACITY.map((opacity) => (
          <span key={opacity} className="size-2 rounded-[2px] bg-accent" style={{ opacity }} />
        ))}
        <span className="text-[11px] leading-[14px] text-muted">больше</span>
      </div>
    </div>
  )
}
