import { formatPhoneNumber } from '@/lib/auth/phone'

/** Vendor test account for App Store / review (matches mobile + edge functions). */
export const TEST_PHONE_NUMBER = '+2348055550123'
export const TEST_EMAIL = 'appreviewer@foodma.co'
export const TEST_OTP = '111111'

export const TEST_USER_ID = '00000000-0000-0000-0000-000000000123'

export const DESKTOP_TEST_SESSION_KEY = 'desktop_test_session'

export function isTestEmail(email: string): boolean {
  return email.trim().toLowerCase() === TEST_EMAIL
}

export function isTestPhoneNumber(phone: string): boolean {
  const formatted = formatPhoneNumber(phone).replace(/\s+/g, '').trim()
  const normalizedTest = TEST_PHONE_NUMBER.replace(/\s+/g, '').trim()

  const digits = formatted.replace(/\D/g, '')
  const testDigits = normalizedTest.replace(/\D/g, '')

  return (
    formatted === normalizedTest ||
    digits === testDigits ||
    `+${digits}` === normalizedTest ||
    `+234${digits}` === normalizedTest ||
    (digits.startsWith('0') && `+234${digits.slice(1)}` === normalizedTest)
  )
}

export function getExpectedTestOtp(_emailOrPhone?: string): string {
  return TEST_OTP
}

export function isTestUserId(userId: string | null | undefined): boolean {
  return userId === TEST_USER_ID
}

export function isTestProfile(profile: {
  id: string
  phone?: string | null
  email?: string | null
}): boolean {
  return (
    isTestUserId(profile.id) ||
    (profile.email ? isTestEmail(profile.email) : false) ||
    (profile.phone ? isTestPhoneNumber(profile.phone) : false)
  )
}
