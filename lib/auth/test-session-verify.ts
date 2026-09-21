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

  // Heal App Reviewer so Desktop/Foodpos entitlement checks pass.
  const now = new Date().toISOString()
  const patch: Record<string, unknown> = { updated_at: now }
  if ((profile.role || '').toLowerCase() !== 'premium') patch.role = 'premium'
  if (profile.premium_status !== 'premium') {
    patch.premium_status = 'premium'
    patch.premium_approved_date = now
  }
  if ((profile.vendor_type || '').toLowerCase() !== 'restaurant') {
    patch.vendor_type = 'restaurant'
  }
  if (!profile.email) patch.email = 'appreviewer@foodma.co'
  if (!profile.business_name) patch.business_name = 'Foodma Demo Restaurant'
  if (Object.keys(patch).length > 1) {
    await supabase.from('profiles').update(patch).eq('id', profile.id)
    Object.assign(profile, patch)
  }
  await supabase.from('vendor_subscriptions').upsert(
    {
      vendor_id: profile.id,
      status: 'active',
      trial_ends_at: null,
      current_period_end: new Date(
        Date.now() + 10 * 365 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      started_at: now,
      updated_at: now,
    },
    { onConflict: 'vendor_id' },
  )

  const { data: subscription } = await supabase
    .from('vendor_subscriptions')
    .select('status, trial_ends_at, current_period_end')
    .eq('vendor_id', profile.id)
    .maybeSingle()

  if (!canAccessRestaurantDesktop(profile, subscription)) {
    console.warn('[test-auth] Profile found but desktop access denied:', {
      role: profile.role,
      vendor_type: profile.vendor_type,
    })
    return { ok: false, message: getDesktopAccessDenialMessage(profile, subscription) }
  }

  console.log('[test-auth] Test session ready for', profile.id)
  return { ok: true, profile, isTestSession: true }
}
