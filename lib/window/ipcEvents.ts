import { type BrowserWindow, ipcMain, shell } from 'electron'
import os from 'os'

const WINDOW_CHANNELS = [
  'init-window',
  'is-window-minimizable',
  'is-window-maximizable',
  'window-minimize',
  'window-maximize',
  'window-close',
  'window-maximize-toggle',
  'web-undo',
  'web-redo',
  'web-cut',
  'web-copy',
  'web-paste',
  'web-delete',
  'web-select-all',
  'web-reload',
  'web-force-reload',
  'web-toggle-devtools',
  'web-actual-size',
  'web-zoom-in',
  'web-zoom-out',
  'web-toggle-fullscreen',
  'web-open-url',
] as const

function bindHandler(channel: string, handler: (...args: unknown[]) => unknown) {
  ipcMain.removeHandler(channel)
  ipcMain.handle(channel, handler)
}

export const registerWindowIPC = (mainWindow: BrowserWindow) => {
  mainWindow.setMenuBarVisibility(false)

  // Drop prior bindings so activate / second-instance cannot double-register.
  for (const channel of WINDOW_CHANNELS) {
    ipcMain.removeHandler(channel)
  }

  bindHandler('init-window', () => {
    const { width, height } = mainWindow.getBounds()
    const minimizable = mainWindow.isMinimizable()
    const maximizable = mainWindow.isMaximizable()
    const platform = os.platform()

    return { width, height, minimizable, maximizable, platform }
  })

  bindHandler('is-window-minimizable', () => mainWindow.isMinimizable())
  bindHandler('is-window-maximizable', () => mainWindow.isMaximizable())
  bindHandler('window-minimize', () => mainWindow.minimize())
  bindHandler('window-maximize', () => mainWindow.maximize())
  bindHandler('window-close', () => mainWindow.close())
  bindHandler('window-maximize-toggle', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })

  const webContents = mainWindow.webContents
  bindHandler('web-undo', () => webContents.undo())
  bindHandler('web-redo', () => webContents.redo())
  bindHandler('web-cut', () => webContents.cut())
  bindHandler('web-copy', () => webContents.copy())
  bindHandler('web-paste', () => webContents.paste())
  bindHandler('web-delete', () => webContents.delete())
  bindHandler('web-select-all', () => webContents.selectAll())
  bindHandler('web-reload', () => webContents.reload())
  bindHandler('web-force-reload', () => webContents.reloadIgnoringCache())
  bindHandler('web-toggle-devtools', () => webContents.toggleDevTools())
  bindHandler('web-actual-size', () => webContents.setZoomLevel(0))
  bindHandler('web-zoom-in', () => webContents.setZoomLevel(webContents.zoomLevel + 0.5))
  bindHandler('web-zoom-out', () => webContents.setZoomLevel(webContents.zoomLevel - 0.5))
  bindHandler('web-toggle-fullscreen', () => mainWindow.setFullScreen(!mainWindow.fullScreen))
  bindHandler('web-open-url', (_e, url) => shell.openExternal(String(url)))
}
