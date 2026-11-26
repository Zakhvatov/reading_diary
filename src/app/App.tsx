import { RouterProvider } from 'react-router-dom'
import { UpdateToast } from './UpdateToast'
import { router } from './router'

export function App() {
  return (
    <>
      <RouterProvider router={router} />
      <UpdateToast />
    </>
  )
}
