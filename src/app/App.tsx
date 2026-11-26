import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { getSettings } from '@/db/repositories/settings'
import { UpdateToast } from './UpdateToast'
import { router } from './router'

export function App() {
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
