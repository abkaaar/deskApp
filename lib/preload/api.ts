import { ipcRenderer } from 'electron'
import type { CreateTaskInput, Task, UpdateTaskInput } from '@/lib/shared/types'

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
}

export default api
