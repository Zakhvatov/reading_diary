import type { ThemeId } from '@/lib/theme'
import { useHomeData } from './home/homeData'
import { DiaryHome } from './home/DiaryHome'
import { LeopardHome } from './home/LeopardHome'
import { ShelfHome } from './home/ShelfHome'

export function HomeScreen() {
  const data = useHomeData()
  const bootTheme = document.documentElement.dataset.theme as ThemeId | undefined
  const theme = data.settings?.theme ?? bootTheme ?? 'shelf'

  if (theme === 'diary') return <DiaryHome data={data} />
  if (theme === 'leopard') return <LeopardHome data={data} />
  return <ShelfHome data={data} />
}
