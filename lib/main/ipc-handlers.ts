import { ipcMain } from 'electron'
import { registerCrudHandlers } from '@/lib/ipc/createCrudHandlers'
import { settingsService, tasksService } from './services'

export function registerIpcHandlers() {
  registerCrudHandlers('tasks', tasksService)

  ipcMain.handle('settings:get', (_, key: string) => settingsService.get(key))
  ipcMain.handle('settings:set', (_, key: string, value: string) =>
    settingsService.set(key, value)
  )

  console.warn('IPC handlers registered')
}
