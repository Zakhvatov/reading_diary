import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { useSettings } from '@/db/live'
import { getSettings } from '@/db/repositories/settings'
import { UpdateToast } from './UpdateToast'
import { useApplyAppearance } from './useAppearance'
import { router } from './router'

export function App() {
  const settings = useSettings()
  useApplyAppearance(settings?.theme, settings?.themeMode)

  useEffect(() => {
    void getSettings()
  }, [])

  return (
    <>
      <RouterProvider router={router} />
      <UpdateToast />
    </>
  )
}
