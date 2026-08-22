import { BrowserWindow, shell, app, protocol, net, screen } from 'electron'
import { join } from 'path'
import { registerWindowIPC } from '@/lib/window/ipcEvents'
import appIcon from '@/resources/build/icon.png?asset'
import { pathToFileURL } from 'url'
import { APP_CONFIG } from '@/lib/shared/config'

export function createAppWindow(): void {
  registerResourcesProtocol()

  const mainWindow = new BrowserWindow({
    width: APP_CONFIG.width,
    height: APP_CONFIG.height,
    minWidth: APP_CONFIG.minWidth,
    minHeight: APP_CONFIG.minHeight,
    show: false,
    backgroundColor: APP_CONFIG.backgroundColor,
    icon: appIcon,
    frame: false,
    title: APP_CONFIG.title,
    resizable: true,
    maximizable: true,
    center: true,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      sandbox: false,
    },
  })

  registerWindowIPC(mainWindow)

  const revealWindow = () => {
    placeWindowOnScreen(mainWindow)
    if (!mainWindow.isVisible()) mainWindow.show()
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }

  mainWindow.once('ready-to-show', revealWindow)

  // Fallback if ready-to-show never fires (common with failed/slow renderer loads)
  setTimeout(() => {
    if (!mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      console.warn('ready-to-show timed out — forcing window reveal')
      revealWindow()
    }
  }, 2500)

  mainWindow.webContents.on('did-fail-load', (_event, code, desc, url) => {
    console.error('Renderer failed to load:', { code, desc, url })
    revealWindow()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/** Reposition windows that ended up off any display or shrunk to a tiny ghost size. */
export function placeWindowOnScreen(win: BrowserWindow): void {
  if (win.isDestroyed()) return

  const bounds = win.getBounds()
  const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y })
  const area = display.workArea
  const overlapsDisplay =
    bounds.x < area.x + area.width &&
    bounds.x + bounds.width > area.x &&
    bounds.y < area.y + area.height &&
    bounds.y + bounds.height > area.y
  const tooSmall = bounds.width < APP_CONFIG.minWidth || bounds.height < APP_CONFIG.minHeight

  if (!overlapsDisplay || tooSmall) {
    const width = Math.min(APP_CONFIG.width, area.width)
    const height = Math.min(APP_CONFIG.height, area.height)
    win.setBounds({
      x: Math.round(area.x + (area.width - width) / 2),
      y: Math.round(area.y + (area.height - height) / 2),
      width,
      height,
    })
  } else {
    win.center()
  }
}

function registerResourcesProtocol() {
  if (protocol.isProtocolHandled('res')) return

  protocol.handle('res', async (request) => {
    try {
      const url = new URL(request.url)
      const fullPath = join(url.hostname, url.pathname.slice(1))
      const filePath = join(__dirname, '../../resources', fullPath)
      return net.fetch(pathToFileURL(filePath).toString())
    } catch (error) {
      console.error('Protocol error:', error)
      return new Response('Resource not found', { status: 404 })
    }
  })
}
