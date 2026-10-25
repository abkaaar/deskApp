import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'

import type { UpdaterStatus } from '@/lib/shared/updater'

export type { UpdaterStatus }

const UPDATER_CHANNELS = [
  'app:getVersion',
  'updater:check',
  'updater:download',
  'updater:install',
] as const

let registered = false

function broadcast(payload: UpdaterStatus) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('updater:status', payload)
    }
  }
}

export function registerUpdater(): void {
  if (registered) return
  registered = true

  for (const channel of UPDATER_CHANNELS) {
    ipcMain.removeHandler(channel)
  }

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    broadcast({ status: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    broadcast({ status: 'available', version: info.version })
  })

  autoUpdater.on('update-not-available', (info) => {
    broadcast({ status: 'not-available', version: info.version })
  })

  autoUpdater.on('download-progress', (progress) => {
    broadcast({ status: 'downloading', percent: Math.round(progress.percent) })
  })

  autoUpdater.on('update-downloaded', (info) => {
    broadcast({ status: 'downloaded', version: info.version })
  })

  autoUpdater.on('error', (error) => {
    broadcast({
      status: 'error',
      message: error?.message || 'Update failed',
    })
  })

  ipcMain.handle('app:getVersion', () => app.getVersion())

  ipcMain.handle('updater:check', async () => {
    if (!app.isPackaged) {
      const payload: UpdaterStatus = {
        status: 'dev-skipped',
        message: 'Updates are only available in the installed app.',
      }
      broadcast(payload)
      return payload
    }
    try {
      broadcast({ status: 'checking' })
      const result = await autoUpdater.checkForUpdates()
      return {
        status: result?.updateInfo ? 'available' : 'not-available',
        version: result?.updateInfo?.version ?? app.getVersion(),
      }
    } catch (error) {
      const payload: UpdaterStatus = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Could not check for updates',
      }
      broadcast(payload)
      return payload
    }
  })

  ipcMain.handle('updater:download', async () => {
    if (!app.isPackaged) {
      return { status: 'dev-skipped', message: 'Updates are only available in the installed app.' }
    }
    try {
      await autoUpdater.downloadUpdate()
      return { status: 'ok' }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Download failed'
      broadcast({ status: 'error', message })
      return { status: 'error', message }
    }
  })

  ipcMain.handle('updater:install', () => {
    if (!app.isPackaged) {
      return { status: 'dev-skipped' }
    }
    autoUpdater.quitAndInstall(false, true)
    return { status: 'ok' }
  })
}
