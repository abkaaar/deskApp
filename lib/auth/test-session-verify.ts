import type { SupabaseClient } from '@supabase/supabase-js'

import { AUTH_ERRORS } from '@/lib/auth/auth-security'
import {
  canAccessRestaurantDesktop,
  getDesktopAccessDenialMessage,
} from '@/lib/auth/desktop-access'
import { findProfileByPhoneOrEmail } from '@/lib/auth/profile-lookup'
import { formatPhoneNumber } from '@/lib/auth/phone'
import {
  getExpectedTestOtp,
  isTestPhoneNumber,
} from '@/lib/auth/test-auth'
import type { RestaurantDesktopProfile } from '@/lib/auth/vendor-auth'

/**
 * Verify OTP for test phone numbers without Supabase Auth session.
 * Mirrors mobile useAuthStore test bypass (client-side OTP + DB profile load).
 */
export async function verifyTestRestaurantDesktopOtp(
  supabase: SupabaseClient,
  phone: string,
  otp: string,
  email?: string,
): Promise<
  | { ok: true; profile: RestaurantDesktopProfile; isTestSession: true }
  | { ok: false; message: string }
> {
  const formattedPhone = formatPhoneNumber(phone)

  if (!isTestPhoneNumber(formattedPhone)) {
    return { ok: false, message: AUTH_ERRORS.verifyFailed }
  }

  if (otp.trim() !== getExpectedTestOtp(formattedPhone)) {
    return { ok: false, message: AUTH_ERRORS.verifyFailed }
  }

  console.log('[test-auth] Test OTP accepted — loading profile from database')

  const profile = await findProfileByPhoneOrEmail(
    supabase,
    formattedPhone,
    email,
  )

  if (!profile) {
    console.warn('[test-auth] No profile found for test phone/email')
    return { ok: false, message: AUTH_ERRORS.noProfile }
  }

  if (!canAccessRestaurantDesktop(profile)) {
    console.warn('[test-auth] Profile found but desktop access denied:', {
      role: profile.role,
      vendor_type: profile.vendor_type,
    })
    return { ok: false, message: getDesktopAccessDenialMessage(profile) }
  }

  console.log('[test-auth] Test session ready for', profile.id)
  return { ok: true, profile, isTestSession: true }
}
