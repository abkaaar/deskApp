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
