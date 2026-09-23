import { webBrandHost } from '@/lib/web-domain'

export function isValidOtpCode(otp: string): boolean {
  return /^\d{6}$/.test(otp.trim())
}

export const AUTH_ERRORS = {
  invalidEmail: 'Please enter a valid email address',
  emailNotRegistered:
    `No vendor account is linked to this email. Create an account on ${webBrandHost()} to get started.`,
  invalidPhone: 'Please enter a valid WhatsApp phone number',
  invalidOtp: 'Enter the 6-digit code sent to your WhatsApp',
  verifyFailed: 'Invalid or expired verification code. Please try again.',
  notPremium:
    'Foodpos is for approved premium restaurant accounts only.',
  notRestaurant:
    'This app is for restaurant businesses only. Other vendor types should use the Foodma mobile app.',
  noDesktopAccess: 'Your account does not have access to Foodpos.',
  noProfile: 'No vendor account is linked to this phone number.',
  tooManyAttempts: 'Too many attempts. Request a new code and try again.',
  sendFailed: 'Could not send verification code. Please try again shortly.',
  sessionExpired: 'Your session expired. Please sign in again.',
} as const

export const MAX_OTP_ATTEMPTS = 5
export const OTP_RESEND_SECONDS = 60
