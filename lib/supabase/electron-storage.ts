import type { SupportedStorage } from '@supabase/supabase-js'

export const electronAuthStorage: SupportedStorage = {
  getItem: (key: string) => {
    return window.api.auth.getItem(key)
  },
  setItem: (key: string, value: string) => {
    void window.api.auth.setItem(key, value)
  },
  removeItem: (key: string) => {
    void window.api.auth.removeItem(key)
  },
}
