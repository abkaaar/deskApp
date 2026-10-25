import { ipcRenderer, type IpcRendererEvent } from 'electron'
import type {
  CreateHeldCartInput,
  CreateTaskInput,
  HeldCartRecord,
  Task,
  UpdateTaskInput,
} from '@/lib/shared/types'
import type { CustomerDisplayInfo, CustomerDisplayState } from '@/lib/shared/customerDisplay'
import type { UpdaterStatus } from '@/lib/shared/updater'

const api = {
  send: (channel: string, ...args: unknown[]) => {
    ipcRenderer.send(channel, ...args)
  },
  receive: (channel: string, func: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_, ...args) => func(...args))
  },
  invoke: (channel: string, ...args: unknown[]) => {
    return ipcRenderer.invoke(channel, ...args)
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  },

  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
  },

  updater: {
    check: (): Promise<UpdaterStatus> => ipcRenderer.invoke('updater:check'),
    download: (): Promise<{ status: string; message?: string }> =>
      ipcRenderer.invoke('updater:download'),
    install: (): Promise<{ status: string }> => ipcRenderer.invoke('updater:install'),
    onStatus: (handler: (status: UpdaterStatus) => void): (() => void) => {
      const listener = (_: IpcRendererEvent, status: UpdaterStatus) => handler(status)
      ipcRenderer.on('updater:status', listener)
      return () => ipcRenderer.removeListener('updater:status', listener)
    },
  },

  customerDisplay: {
    open: (displayId?: number): Promise<boolean> =>
      ipcRenderer.invoke('customerDisplay:open', displayId),
    close: (): Promise<boolean> => ipcRenderer.invoke('customerDisplay:close'),
    isOpen: (): Promise<boolean> => ipcRenderer.invoke('customerDisplay:isOpen'),
    listDisplays: (): Promise<CustomerDisplayInfo[]> =>
      ipcRenderer.invoke('customerDisplay:listDisplays'),
    pushState: (state: CustomerDisplayState): Promise<boolean> =>
      ipcRenderer.invoke('customerDisplay:pushState', state),
    onState: (handler: (state: CustomerDisplayState) => void): (() => void) => {
      const listener = (_: IpcRendererEvent, state: CustomerDisplayState) => handler(state)
      ipcRenderer.on('customerDisplay:state', listener)
      return () => ipcRenderer.removeListener('customerDisplay:state', listener)
    },
  },

  tasks: {
    getAll: (): Promise<Task[]> => ipcRenderer.invoke('tasks:getAll'),
    getById: (id: string): Promise<Task | undefined> =>
      ipcRenderer.invoke('tasks:getById', id),
    create: (data: CreateTaskInput): Promise<Task> =>
      ipcRenderer.invoke('tasks:create', data),
    update: (id: string, data: UpdateTaskInput): Promise<Task | undefined> =>
      ipcRenderer.invoke('tasks:update', id, data),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke('tasks:delete', id),
    search: (query: string): Promise<Task[]> => ipcRenderer.invoke('tasks:search', query),
  },

  settings: {
    get: (key: string): Promise<string | undefined> =>
      ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string): Promise<{ key: string; value: string }> =>
      ipcRenderer.invoke('settings:set', key, value),
  },

  auth: {
    getItem: (key: string): Promise<string | null> =>
      ipcRenderer.invoke('auth:getItem', key),
    setItem: (key: string, value: string): Promise<void> =>
      ipcRenderer.invoke('auth:setItem', key, value),
    removeItem: (key: string): Promise<void> =>
      ipcRenderer.invoke('auth:removeItem', key),
    clearAll: (): Promise<void> => ipcRenderer.invoke('auth:clearAll'),
  },

  heldCarts: {
    list: (vendorId: string): Promise<HeldCartRecord[]> =>
      ipcRenderer.invoke('heldCarts:list', vendorId),
    getById: (id: string): Promise<HeldCartRecord | undefined> =>
      ipcRenderer.invoke('heldCarts:getById', id),
    create: (data: CreateHeldCartInput): Promise<HeldCartRecord> =>
      ipcRenderer.invoke('heldCarts:create', data),
    delete: (id: string, vendorId?: string): Promise<boolean> =>
      ipcRenderer.invoke('heldCarts:delete', id, vendorId),
  },
}

export default api
