import { ipcMain } from 'electron'
import type { BaseEntity } from '@/lib/shared/types'
import type { CrudService } from '@/lib/main/services'

export function registerCrudHandlers<T extends BaseEntity>(
  namespace: string,
  service: CrudService<T>
) {
  const channels = [
    `${namespace}:getAll`,
    `${namespace}:getById`,
    `${namespace}:create`,
    `${namespace}:update`,
    `${namespace}:delete`,
    `${namespace}:search`,
  ] as const

  for (const channel of channels) {
    ipcMain.removeHandler(channel)
  }

  ipcMain.handle(`${namespace}:getAll`, () => service.getAll())
  ipcMain.handle(`${namespace}:getById`, (_, id: string) => service.getById(id))
  ipcMain.handle(`${namespace}:create`, (_, data: Omit<T, keyof BaseEntity>) =>
    service.create(data)
  )
  ipcMain.handle(`${namespace}:update`, (_, id: string, data: Partial<T>) =>
    service.update(id, data)
  )
  ipcMain.handle(`${namespace}:delete`, (_, id: string) => service.delete(id))
  ipcMain.handle(`${namespace}:search`, (_, query: string) => service.search(query))
}
