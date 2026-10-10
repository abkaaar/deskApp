import { ipcMain } from 'electron'
import { registerCrudHandlers } from '@/lib/ipc/createCrudHandlers'
import {
  authStorageClearAll,
  authStorageGet,
  authStorageRemove,
  authStorageSet,
} from './auth-storage'
import { heldCartsService, settingsService, tasksService } from './services'
import type { CreateHeldCartInput } from '@/lib/shared/types'

const APP_CHANNELS = [
  'settings:get',
  'settings:set',
  'auth:getItem',
  'auth:setItem',
  'auth:removeItem',
  'auth:clearAll',
  'heldCarts:list',
  'heldCarts:getById',
  'heldCarts:create',
  'heldCarts:delete',
] as const

let registered = false

export function registerIpcHandlers() {
  if (registered) return
  registered = true

  registerCrudHandlers('tasks', tasksService)

  for (const channel of APP_CHANNELS) {
    ipcMain.removeHandler(channel)
  }

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

  ipcMain.handle('heldCarts:list', (_, vendorId: string) =>
    heldCartsService.listByVendor(vendorId),
  )
  ipcMain.handle('heldCarts:getById', (_, id: string) => heldCartsService.getById(id))
  ipcMain.handle('heldCarts:create', (_, data: CreateHeldCartInput) =>
    heldCartsService.create(data),
  )
  ipcMain.handle('heldCarts:delete', (_, id: string, vendorId?: string) =>
    heldCartsService.delete(id, vendorId),
  )

  console.info('IPC handlers registered')
}
