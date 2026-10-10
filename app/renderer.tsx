import React from 'react'
import ReactDOM from 'react-dom/client'
import appIcon from '@/resources/icons/logo.png'
import { WindowContextProvider, menuItems } from '@/lib/window'
import { APP_CONFIG } from '@/lib/shared/config'
import { ErrorBoundary } from './components/ErrorBoundary'
import App from './app'
import './styles/app.css'

const rootEl = document.getElementById('app')
if (!rootEl) {
  throw new Error('Missing #app root element')
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <ErrorBoundary>
      <WindowContextProvider
        titlebar={{ title: APP_CONFIG.title, icon: appIcon, menuItems }}
      >
        <App />
      </WindowContextProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
