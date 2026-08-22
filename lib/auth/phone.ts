/** Shared phone helpers — aligned with Foodma mobile/web auth. */

export function formatPhoneNumber(phone: string): string {
  const stripped = phone.replace(/[\s\-()]/g, '').trim()

  if (stripped.startsWith('+')) {
    return stripped
  }

  const cleanPhone = stripped.replace(/\D/g, '')
  if (cleanPhone.startsWith('234')) {
    return `+${cleanPhone}`
  }
  if (cleanPhone.startsWith('0')) {
    return `+234${cleanPhone.slice(1)}`
  }
  return `+234${cleanPhone}`
}

export function validatePhoneNumber(phone: string): boolean {
  const formatted = formatPhoneNumber(phone)
  if (!formatted.startsWith('+')) return false

  const digits = formatted.slice(1)
  return /^\d{10,15}$/.test(digits)
}

export function maskPhoneNumber(phone: string): string {
  const formatted = formatPhoneNumber(phone)
  if (formatted.length <= 6) return formatted
  return `${formatted.slice(0, 4)}••••${formatted.slice(-3)}`
}
