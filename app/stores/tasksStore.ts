import { create } from 'zustand'
import type { CreateTaskInput, Task, UpdateTaskInput } from '@/lib/shared/types'

interface TasksState {
  tasks: Task[]
  loading: boolean
  error: string | null
  fetchTasks: () => Promise<void>
  createTask: (data: CreateTaskInput) => Promise<void>
  updateTask: (id: string, data: UpdateTaskInput) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  searchTasks: (query: string) => Promise<void>
  clearError: () => void
}

export const useTasksStore = create<TasksState>((set) => ({
  tasks: [],
  loading: false,
  error: null,

  fetchTasks: async () => {
    set({ loading: true, error: null })
    try {
      const tasks = await window.api.tasks.getAll()
      set({ tasks, loading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch tasks',
        loading: false,
      })
    }
  },

  createTask: async (data) => {
    set({ loading: true, error: null })
    try {
      const task = await window.api.tasks.create(data)
      set((state) => ({
        tasks: [task, ...state.tasks],
        loading: false,
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create task',
        loading: false,
      })
    }
  },

  updateTask: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const updated = await window.api.tasks.update(id, data)
      if (updated) {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? updated : t)),
          loading: false,
        }))
      } else {
        set({ loading: false })
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update task',
        loading: false,
      })
    }
  },

  deleteTask: async (id) => {
    set({ loading: true, error: null })
    try {
      await window.api.tasks.delete(id)
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
        loading: false,
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete task',
        loading: false,
      })
    }
  },

  searchTasks: async (query) => {
    set({ loading: true, error: null })
    try {
      const tasks = query.trim()
        ? await window.api.tasks.search(query)
        : await window.api.tasks.getAll()
      set({ tasks, loading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to search tasks',
        loading: false,
      })
    }
  },

  clearError: () => set({ error: null }),
}))
