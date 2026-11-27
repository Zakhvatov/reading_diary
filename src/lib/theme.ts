export type ThemeId = 'lavender' | 'shelf' | 'diary' | 'leopard' | 'leopard-pink'
export type ThemeMode = 'light' | 'dark' | 'system'

export type ThemeInfo = {
  id: ThemeId
  name: string
  description: string
  /** Цвет фона для meta theme-color и сплэша. */
  color: { light: string; dark: string }
}

export const THEME_IDS: ThemeId[] = [
  'lavender',
  'shelf',
  'diary',
  'leopard',
  'leopard-pink',
]

export const THEMES: ThemeInfo[] = [
  {
    id: 'lavender',
    name: 'Лавандовое поле',
    description: 'Прохладное стекло, пастель и крупная антиква.',
    color: { light: '#C9C8F2', dark: '#171326' },
  },
  {
    id: 'shelf',
    name: 'Полка',
    description: 'Тёплая библиотека: лампа, дерево, корешки.',
    color: { light: '#F2E9D9', dark: '#171210' },
  },
  {
    id: 'diary',
    name: 'Дневник',
    description: 'Бумажная страница: поля, штампы, скотч.',
    color: { light: '#F8F2E4', dark: '#1E1B15' },
  },
  {
    id: 'leopard',
    name: 'Леопард',
    description: 'Сливочная бумага, чёрный лак и золото.',
    color: { light: '#F3EBDD', dark: '#14100E' },
  },
  {
    id: 'leopard-pink',
    name: 'Розовый леопард',
    description: 'Розовый шёлк, чёрные розетки и фуксия.',
    color: { light: '#F4C6E2', dark: '#160B12' },
  },
]

export const DEFAULT_THEME: ThemeId = 'lavender'
export const DEFAULT_MODE: ThemeMode = 'light'

export const APPEARANCE_KEY = 'reading-diary:appearance'

export const MODE_LABELS: Record<ThemeMode, string> = {
  light: 'Светлая',
  dark: 'Тёмная',
  system: 'Системная',
}

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as string[]).includes(value)
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system'
}

export function themeInfo(id: ThemeId): ThemeInfo {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0]!
}

export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveMode(mode: ThemeMode, systemDark = systemPrefersDark()): 'light' | 'dark' {
  if (mode === 'system') return systemDark ? 'dark' : 'light'
  return mode
}

export type StoredAppearance = { theme: ThemeId; themeMode: ThemeMode }

export function readStoredAppearance(): StoredAppearance {
  if (typeof localStorage === 'undefined') {
    return { theme: DEFAULT_THEME, themeMode: DEFAULT_MODE }
  }

  try {
    const raw = localStorage.getItem(APPEARANCE_KEY)
    if (!raw) return { theme: DEFAULT_THEME, themeMode: DEFAULT_MODE }
    const parsed = JSON.parse(raw) as Partial<StoredAppearance>
    return {
      theme: isThemeId(parsed.theme) ? parsed.theme : DEFAULT_THEME,
      themeMode: isThemeMode(parsed.themeMode) ? parsed.themeMode : DEFAULT_MODE,
    }
  } catch {
    return { theme: DEFAULT_THEME, themeMode: DEFAULT_MODE }
  }
}

/** Применяет тему к <html>. Возвращает фактический режим (system уже разрешён). */
export function applyAppearance(theme: ThemeId, mode: ThemeMode): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light'

  const resolved = resolveMode(mode)
  const root = document.documentElement
  root.dataset.theme = theme === 'leopard-pink' ? 'leopard' : theme
  if (theme === 'leopard-pink') root.dataset.leopard = 'pink'
  else delete root.dataset.leopard
  root.dataset.mode = resolved
  root.style.colorScheme = resolved

  const info = themeInfo(theme)
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (meta) meta.content = info.color[resolved]

  try {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify({ theme, themeMode: mode }))
  } catch {
    // Приватный режим может запрещать запись — тема проживёт до перезагрузки.
  }

  return resolved
}
