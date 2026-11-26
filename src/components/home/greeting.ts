const HOME_DATE = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

/** Приветствие по местному времени: утро, день, вечер, ночь. */
export function greetingFor(date: Date = new Date()): string {
  const hour = date.getHours()

  if (hour >= 5 && hour < 12) return 'Доброе утро'
  if (hour >= 12 && hour < 18) return 'Добрый день'
  if (hour >= 18 && hour < 23) return 'Добрый вечер'
  return 'Доброй ночи'
}

/** «Четверг, 26 ноября» — вторая, тихая строка шапки. */
export function formatHomeDate(date: Date = new Date()): string {
  const text = HOME_DATE.format(date)
  return text.charAt(0).toUpperCase() + text.slice(1)
}
