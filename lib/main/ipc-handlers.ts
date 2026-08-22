import { ipcMain } from 'electron'
import { registerCrudHandlers } from '@/lib/ipc/createCrudHandlers'
import {
  authStorageClearAll,
  authStorageGet,
  authStorageRemove,
  authStorageSet,
} from './auth-storage'
import { settingsService, tasksService } from './services'

export function registerIpcHandlers() {
  registerCrudHandlers('tasks', tasksService)

  ipcMain.handle('settings:get', (_, key: string) => settingsService.get(key))
  ipcMain.handle('settings:set', (_, key: string, value: string) =>
    settingsService.set(key, value)
  )

  ipcMain.handle('auth:getItem', (_, key: string) => authStorageGet(key))
  ipcMain.handle('auth:setItem', (_, key: string, value: string) => {
    authStorageSet(key, value)
  })
  ipcMain.handle('auth:removeItem', (_, key: string) => {
    authStorageRemove(key)
  })
  ipcMain.handle('auth:clearAll', () => {
    authStorageClearAll()
  })

  console.warn('IPC handlers registered')
}
