import { safeStorage } from 'electron'

import { settingsService } from './services'

const AUTH_STORAGE_PREFIX = 'auth:'

function storageKey(key: string): string {
  return `${AUTH_STORAGE_PREFIX}${key}`
}

export function authStorageGet(key: string): string | null {
  const stored = settingsService.get(storageKey(key))
  if (!stored) return null

  try {
    if (safeStorage.isEncryptionAvailable()) {
      const buffer = Buffer.from(stored, 'base64')
      return safeStorage.decryptString(buffer)
    }
    return stored
  } catch (error) {
    console.warn('[auth-storage] decrypt failed:', error)
    return null
  }
}

export function authStorageSet(key: string, value: string): void {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(value)
      settingsService.set(storageKey(key), encrypted.toString('base64'))
      return
    }
    settingsService.set(storageKey(key), value)
  } catch (error) {
    console.warn('[auth-storage] encrypt failed:', error)
    settingsService.set(storageKey(key), value)
  }
}

export function authStorageRemove(key: string): void {
  settingsService.remove(storageKey(key))
}

export function authStorageClearAll(): void {
  settingsService.removeByPrefix(AUTH_STORAGE_PREFIX)
}
