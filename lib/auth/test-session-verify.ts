import type { SupabaseClient } from '@supabase/supabase-js'

import { AUTH_ERRORS } from '@/lib/auth/auth-security'
import {
  canAccessRestaurantDesktop,
  getDesktopAccessDenialMessage,
} from '@/lib/auth/desktop-access'
import { findProfileByEmail } from '@/lib/auth/profile-lookup'
import {
  getExpectedTestOtp,
  isTestEmail,
  TEST_EMAIL,
  TEST_OTP,
  TEST_PHONE_NUMBER,
  TEST_USER_ID,
} from '@/lib/auth/test-auth'
import type { RestaurantDesktopProfile } from '@/lib/auth/vendor-auth'

const DEMO_APP_REVIEWER_PROFILE: RestaurantDesktopProfile = {
  id: TEST_USER_ID,
  username: 'AppReviewer_123',
  phone: TEST_PHONE_NUMBER,
  name: 'App Reviewer',
  business_name: 'Foodma Demo Restaurant',
  role: 'premium',
  vendor_type: 'restaurant',
  premium_status: 'premium',
  subscription_tier: 'standard',
  avatar_url: null,
  email: TEST_EMAIL,
}

/**
 * Load App Reviewer profile: SECURITY DEFINER RPC → table select → hardcoded demo.
 * Mirrors foodma mobile `findAppReviewProfile` / Foodpos `resolveAppReviewProfile`.
 */
async function resolveAppReviewProfile(
  supabase: SupabaseClient,
  email: string,
): Promise<RestaurantDesktopProfile> {
  const { data: rpcRows, error: rpcError } = await supabase.rpc(
    'get_app_review_profile',
    { p_email: email },
  )

  if (rpcError) {
    console.warn(
      '[test-auth] get_app_review_profile RPC failed:',
      rpcError.message,
    )
  } else {
    const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows
    if (row && typeof row === 'object' && 'id' in row) {
      return {
        id: row.id as string,
        username: (row.username as string) || DEMO_APP_REVIEWER_PROFILE.username,
        phone: (row.phone as string) || DEMO_APP_REVIEWER_PROFILE.phone,
        name: (row.name as string | null) ?? DEMO_APP_REVIEWER_PROFILE.name,
        business_name:
          (row.business_name as string | null) ??
          DEMO_APP_REVIEWER_PROFILE.business_name,
        role: (row.role as string | null) ?? DEMO_APP_REVIEWER_PROFILE.role,
        vendor_type:
          (row.vendor_type as string | null) ??
          DEMO_APP_REVIEWER_PROFILE.vendor_type,
        premium_status:
          (row.premium_status as string | null) ??
          DEMO_APP_REVIEWER_PROFILE.premium_status,
        subscription_tier:
          (row.subscription_tier as string | null) ??
          DEMO_APP_REVIEWER_PROFILE.subscription_tier,
        avatar_url: (row.avatar_url as string | null) ?? null,
        email: (row.email as string | null) ?? TEST_EMAIL,
      }
    }
  }

  const fromTable = await findProfileByEmail(supabase, email)
  if (fromTable) return fromTable

  console.warn(
    '[test-auth] Using local App Review fallback profile. Apply migration 20261020_app_reviewer_profile_rpc.sql for DB-backed review.',
  )
  return { ...DEMO_APP_REVIEWER_PROFILE }
}

/**
 * Verify OTP for the App Reviewer test email without Supabase Auth session.
 * Mirrors mobile / Foodpos test bypass (client-side OTP + profile load).
 * On valid OTP always admits (fail-open) so RLS/subscription quirks never block review.
 */
export async function verifyTestRestaurantDesktopOtp(
  supabase: SupabaseClient,
  email: string,
  otp: string,
): Promise<
  | { ok: true; profile: RestaurantDesktopProfile; isTestSession: true }
  | { ok: false; message: string }
> {
  const normalizedEmail = email.trim().toLowerCase()

  if (!isTestEmail(normalizedEmail)) {
    return { ok: false, message: AUTH_ERRORS.verifyFailed }
  }

  if (otp.trim() !== getExpectedTestOtp(normalizedEmail)) {
    return { ok: false, message: AUTH_ERRORS.verifyFailed }
  }

  console.log('[test-auth] Test OTP accepted — loading profile (RPC-first)')

  try {
    const profile = await resolveAppReviewProfile(supabase, normalizedEmail)

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
    if (!profile.email) patch.email = TEST_EMAIL
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
      console.warn(
        '[test-auth] Entitlement denied — fail-open admit with demo profile',
        {
          role: profile.role,
          vendor_type: profile.vendor_type,
        },
      )
      // Never block App Review after correct OTP.
      return {
        ok: true,
        profile: { ...DEMO_APP_REVIEWER_PROFILE },
        isTestSession: true,
      }
    }

    console.log('[test-auth] Test session ready for', profile.id)
    return { ok: true, profile, isTestSession: true }
  } catch (err) {
    console.warn(
      '[test-auth] Profile load failed after valid OTP — admitting demo:',
      err,
    )
    return {
      ok: true,
      profile: { ...DEMO_APP_REVIEWER_PROFILE },
      isTestSession: true,
    }
  }
}

/** Exported for tests — expected App Review OTP. */
export const APP_REVIEW_TEST_OTP = TEST_OTP
