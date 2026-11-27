import type { ThemeId } from '@/lib/theme'
import { useHomeData } from './home/homeData'
import { DiaryHome } from './home/DiaryHome'
import { LavenderHome } from './home/LavenderHome'
import { LeopardHome } from './home/LeopardHome'
import { ShelfHome } from './home/ShelfHome'

export function HomeScreen() {
  const data = useHomeData()
  const bootTheme = document.documentElement.dataset.theme as ThemeId | undefined
  const theme = data.settings?.theme ?? bootTheme ?? 'lavender'

  if (theme === 'lavender') return <LavenderHome data={data} />
  if (theme === 'diary') return <DiaryHome data={data} />
  if (theme === 'leopard' || theme === 'leopard-pink') return <LeopardHome data={data} />
  return <ShelfHome data={data} />
}
