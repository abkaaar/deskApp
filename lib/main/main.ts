import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createAppWindow } from './app'
import { initializeDatabase } from './database'
import { registerIpcHandlers } from './ipc-handlers'

function initApp() {
  try {
    initializeDatabase()
    registerIpcHandlers()
  } catch (error) {
    console.error('Failed to initialize app:', error)
  }
}

app.whenReady().then(() => {
  initApp()

  electronApp.setAppUserModelId('com.electron')
  createAppWindow()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createAppWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
