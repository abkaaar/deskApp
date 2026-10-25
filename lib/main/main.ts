import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { join } from 'path'
import { createAppWindow, getMainAppWindow, placeWindowOnScreen } from './app'
import { disposeCustomerDisplay, registerCustomerDisplayIpc } from './customerDisplay'
import { initializeDatabase } from './database'
import { registerIpcHandlers } from './ipc-handlers'
import { registerUpdater } from './updater'

// Must run before app.ready — avoids Windows cache lock spam when a prior
 // Electron instance still holds %AppData%/foodma-desktop/Cache.
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')
  app.commandLine.appendSwitch('disk-cache-dir', join(app.getPath('temp'), 'foodma-desktop-cache'))
}

const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const mainWindow = getMainAppWindow() ?? BrowserWindow.getAllWindows()[0]
    if (!mainWindow) {
      createAppWindow()
      return
    }
    placeWindowOnScreen(mainWindow)
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  })

  function initApp() {
    try {
      initializeDatabase()
      registerIpcHandlers()
      registerUpdater()
      registerCustomerDisplayIpc()
    } catch (error) {
      console.error('Failed to initialize app:', error)
    }
  }

  app.whenReady().then(() => {
    initApp()

    electronApp.setAppUserModelId('com.foodma.desktop')
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
    disposeCustomerDisplay()
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('before-quit', () => {
    disposeCustomerDisplay()
  })
}
