/** Shared phone helpers — E.164-first (worldwide signup). */

const KNOWN_DIAL_DIGITS = [
  '880',
  '971',
  '966',
  '256',
  '255',
  '254',
  '251',
  '250',
  '244',
  '243',
  '237',
  '234',
  '233',
  '225',
  '221',
  '212',
  '211',
  '353',
  '91',
  '86',
  '82',
  '81',
  '65',
  '63',
  '61',
  '60',
  '55',
  '52',
  '49',
  '47',
  '46',
  '44',
  '41',
  '39',
  '34',
  '33',
  '31',
  '27',
  '20',
  '1',
].sort((a, b) => b.length - a.length)

function stripToE164Plus(digits: string): string {
  return digits ? `+${digits}` : ''
}

export function buildFullPhone(dialCode: string, localDigits: string): string {
  const trimmed = localDigits.trim()
  if (!trimmed) return ''

  if (dialCode === '+' || dialCode === '' || dialCode.toUpperCase() === 'OTHER') {
    if (trimmed.startsWith('+')) {
      return formatPhoneNumber(trimmed)
    }
    const digits = trimmed.replace(/\D/g, '')
    if (!digits) return ''
    const known = formatPhoneNumber(digits)
    if (known) return known
    if (digits.length >= 10 && digits.length <= 15) {
      return stripToE164Plus(digits)
    }
    return ''
  }

  if (trimmed.startsWith('+')) {
    return formatPhoneNumber(trimmed)
  }

  const dial = dialCode.startsWith('+') ? dialCode : `+${dialCode}`
  const dialDigits = dial.replace(/\D/g, '')
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return ''

  if (
    digits.startsWith(dialDigits) &&
    digits.length >= dialDigits.length + 7 &&
    digits.length <= 15
  ) {
    return stripToE164Plus(digits)
  }

  const local = digits.startsWith('0') ? digits.slice(1) : digits
  if (!local) return ''

  if (local.length > 10) {
    const asInternational = formatPhoneNumber(digits)
    if (asInternational) return asInternational
  }

  return `${dial}${local}`
}

/**
 * Normalize to E.164. Never silently forces +234.
 * Pass `defaultDial` (e.g. from a country picker) for local/national numbers.
 */
export function formatPhoneNumber(
  phone: string,
  options?: { defaultDial?: string },
): string {
  const stripped = phone.replace(/[\s\-()]/g, '').trim()
  if (!stripped) return ''

  if (stripped.startsWith('+')) {
    const digits = stripped.slice(1).replace(/\D/g, '')
    return stripToE164Plus(digits)
  }

  const cleanPhone = stripped.replace(/\D/g, '')
  if (!cleanPhone) return ''

  for (const dial of KNOWN_DIAL_DIGITS) {
    if (
      cleanPhone.startsWith(dial) &&
      cleanPhone.length >= dial.length + 7 &&
      cleanPhone.length <= 15
    ) {
      return stripToE164Plus(cleanPhone)
    }
  }

  if (options?.defaultDial) {
    return buildFullPhone(options.defaultDial, cleanPhone)
  }

  return ''
}

export function validatePhoneNumber(
  phone: string,
  options?: { defaultDial?: string },
): boolean {
  const formatted = formatPhoneNumber(phone, options)
  if (!formatted.startsWith('+')) return false
  const digits = formatted.slice(1)
  return /^\d{10,15}$/.test(digits)
}

export function phoneDigits(phone: string): string {
  const formatted = formatPhoneNumber(phone)
  return formatted ? formatted.replace(/\D/g, '') : ''
}

export function phonesMatch(a: string, b: string): boolean {
  const da = phoneDigits(a)
  const db = phoneDigits(b)
  return Boolean(da && db && da === db)
}

export function maskPhoneNumber(phone: string): string {
  const formatted =
    formatPhoneNumber(phone) || phone.replace(/[\s\-()]/g, '').trim()
  if (formatted.length <= 6) return formatted || '****'
  return `${formatted.slice(0, 4)}••••${formatted.slice(-3)}`
}
