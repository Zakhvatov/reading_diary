export function pluralRu(count: number, forms: [string, string, string]): string {
  const mod100 = Math.abs(count) % 100
  const mod10 = mod100 % 10

  if (mod100 >= 11 && mod100 <= 14) {
    return forms[2]
  }
  if (mod10 === 1) {
    return forms[0]
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return forms[1]
  }
  return forms[2]
}

export function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000)

  if (totalMinutes < 1) {
    return 'меньше минуты'
  }
  if (totalMinutes < 60) {
    return `${totalMinutes} мин`
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const hourLabel = `${hours} ${pluralRu(hours, ['час', 'часа', 'часов'])}`

  return minutes === 0 ? hourLabel : `${hourLabel} ${minutes} мин`
}

export function formatPercent(value: number): string {
  return `${Math.round(Math.min(Math.max(value, 0), 1) * 100)}%`
}
