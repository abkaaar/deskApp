import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import appIcon from '@/resources/icons/logo.png?asset'
import type { CustomerDisplayState } from '@/lib/shared/customerDisplay'

export type { CustomerDisplayState }

const CUSTOMER_CHANNELS = [
  'customerDisplay:open',
  'customerDisplay:close',
  'customerDisplay:isOpen',
  'customerDisplay:listDisplays',
  'customerDisplay:pushState',
] as const

let customerWindow: BrowserWindow | null = null
let lastState: CustomerDisplayState | null = null
let registered = false

function pickExternalDisplay() {
  const displays = screen.getAllDisplays()
  const primary = screen.getPrimaryDisplay()
  return displays.find((d) => d.id !== primary.id) ?? primary
}

function loadCustomerRoute(win: BrowserWindow) {
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    void win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/customer-display`)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: '/customer-display',
    })
  }
}

export function getCustomerDisplayWindow(): BrowserWindow | null {
  if (customerWindow && !customerWindow.isDestroyed()) return customerWindow
  return null
}

export function closeCustomerDisplay(): boolean {
  const win = getCustomerDisplayWindow()
  if (!win) {
    customerWindow = null
    return false
  }
  win.close()
  customerWindow = null
  return true
}

export function openCustomerDisplay(displayId?: number): boolean {
  const existing = getCustomerDisplayWindow()
  if (existing) {
    existing.focus()
    if (lastState) {
      existing.webContents.send('customerDisplay:state', lastState)
    }
    return true
  }

  const displays = screen.getAllDisplays()
  const target =
    (displayId != null ? displays.find((d) => d.id === displayId) : null) ??
    pickExternalDisplay()
  const area = target.bounds

  const win = new BrowserWindow({
    x: area.x,
    y: area.y,
    width: Math.max(800, area.width),
    height: Math.max(600, area.height),
    show: false,
    backgroundColor: '#0a0a0a',
    icon: appIcon,
    frame: false,
    title: 'Foodpos — Customer display',
    resizable: true,
    maximizable: true,
    fullscreenable: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      sandbox: false,
    },
  })

  customerWindow = win
  win.setMenuBarVisibility(false)

  win.once('ready-to-show', () => {
    if (win.isDestroyed()) return
    win.show()
    // Fill the chosen monitor so dual-screen POS can park this on the customer panel.
    if (screen.getAllDisplays().length > 1 && target.id !== screen.getPrimaryDisplay().id) {
      win.setBounds(area)
    }
    if (lastState) {
      win.webContents.send('customerDisplay:state', lastState)
    }
  })

  win.on('closed', () => {
    if (customerWindow === win) customerWindow = null
  })

  loadCustomerRoute(win)
  return true
}

export function pushCustomerDisplayState(state: CustomerDisplayState): void {
  lastState = state
  const win = getCustomerDisplayWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send('customerDisplay:state', state)
  }
}

export function registerCustomerDisplayIpc(): void {
  if (registered) return
  registered = true

  for (const channel of CUSTOMER_CHANNELS) {
    ipcMain.removeHandler(channel)
  }

  ipcMain.handle('customerDisplay:open', (_, displayId?: number) => {
    return openCustomerDisplay(typeof displayId === 'number' ? displayId : undefined)
  })

  ipcMain.handle('customerDisplay:close', () => closeCustomerDisplay())

  ipcMain.handle('customerDisplay:isOpen', () => getCustomerDisplayWindow() !== null)

  ipcMain.handle('customerDisplay:listDisplays', () => {
    const primaryId = screen.getPrimaryDisplay().id
    return screen.getAllDisplays().map((d) => ({
      id: d.id,
      label: d.label || `Display ${d.id}`,
      bounds: d.bounds,
      isPrimary: d.id === primaryId,
    }))
  })

  ipcMain.handle('customerDisplay:pushState', (_, state: CustomerDisplayState) => {
    pushCustomerDisplayState(state)
    return true
  })
}

/** Close CDP when the main app quits. */
export function disposeCustomerDisplay(): void {
  closeCustomerDisplay()
}
