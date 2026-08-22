import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** First two alphanumeric characters for Square-style avatars (e.g. Foodma → FO). */
export function initials(name: string | null | undefined, fallback = 'FO'): string {
  const cleaned = (name ?? '').trim()
  if (!cleaned) return fallback
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const a = parts[0][0] ?? ''
    const b = parts[1][0] ?? ''
    return `${a}${b}`.toUpperCase() || fallback
  }
  const letters = cleaned.replace(/[^a-zA-Z0-9]/g, '')
  return (letters.slice(0, 2) || fallback).toUpperCase()
}

