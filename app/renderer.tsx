import React from 'react'
import ReactDOM from 'react-dom/client'
import appIcon from '@/resources/build/icon.svg'
import { WindowContextProvider, menuItems } from '@/lib/window'
import { APP_CONFIG } from '@/lib/shared/config'
import App from './app'
import './styles/app.css'

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <React.StrictMode>
    <WindowContextProvider
      titlebar={{ title: APP_CONFIG.title, icon: appIcon, menuItems }}
    >
      <App />
    </WindowContextProvider>
  </React.StrictMode>
)
