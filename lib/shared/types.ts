export interface BaseEntity {
  id: string
  created_at: string
  updated_at: string
}

export interface Task extends BaseEntity {
  title: string
  completed: number
}

export type CreateTaskInput = Pick<Task, 'title'> & { completed?: number }
export type UpdateTaskInput = Partial<Pick<Task, 'title' | 'completed'>>

export interface Setting {
  key: string
  value: string
  updated_at: string
}

/** Local parked checkout cart — not a cloud `orders` row. */
export interface HeldCartRecord extends BaseEntity {
  vendor_id: string
  label: string | null
  payload: string
  total: number
  item_count: number
}

export type CreateHeldCartInput = {
  vendor_id: string
  label?: string | null
  payload: string
  total: number
  item_count: number
}
