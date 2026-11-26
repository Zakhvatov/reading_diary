import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import './styles/tokens.css'
import './styles/fonts.css'
import './styles/themes/shelf.css'
import './styles/themes/diary.css'
import './styles/themes/leopard.css'
import './styles/themes/previews.css'
import './styles/base.css'
import './styles/print.css'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Root element #root not found')
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
