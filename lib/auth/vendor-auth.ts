import type { SupabaseClient, User } from '@supabase/supabase-js'

import { AUTH_ERRORS } from '@/lib/auth/auth-security'
import {
  canAccessRestaurantDesktop,
  getDesktopAccessDenialMessage,
} from '@/lib/auth/desktop-access'
import {
  findProfileByPhone,
  phonesMatch,
  PROFILE_FIELDS,
} from '@/lib/auth/profile-lookup'
import { formatPhoneNumber } from '@/lib/auth/phone'
import { isTestPhoneNumber } from '@/lib/auth/test-auth'
import { verifyTestRestaurantDesktopOtp } from '@/lib/auth/test-session-verify'

export type RestaurantDesktopProfile = {
  id: string
  username: string
  phone: string
  name: string | null
  business_name: string | null
  role: string | null
  vendor_type: string | null
  premium_status: string | null
  subscription_tier: string | null
  avatar_url: string | null
  email: string | null
}

async function loadSubscriptionEntitlement(
  supabase: SupabaseClient,
  vendorId: string,
) {
  const { data } = await supabase
    .from('vendor_subscriptions')
    .select('status, trial_ends_at, current_period_end')
    .eq('vendor_id', vendorId)
    .maybeSingle()
  return data
}

async function findProfileForAuthUser(
  supabase: SupabaseClient,
  authUserId: string,
  phone: string,
): Promise<(RestaurantDesktopProfile & { phone_verified?: boolean }) | null> {
  const formattedPhone = formatPhoneNumber(phone)

  const { data: byId, error: byIdError } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .eq('id', authUserId)
    .maybeSingle()

  if (byIdError) {
    console.warn('[vendor-auth] profile lookup by id failed:', byIdError.message)
  }
  if (byId && phonesMatch(byId.phone, formattedPhone)) {
    return byId as RestaurantDesktopProfile & { phone_verified?: boolean }
  }

  const byPhone = await findProfileByPhone(supabase, formattedPhone)
  if (!byPhone) {
    return null
  }

  if (byPhone.id !== authUserId) {
    const { error: linkError } = await supabase
      .from('profiles')
      .update({
        id: authUserId,
        updated_at: new Date().toISOString(),
      })
      .eq('phone', byPhone.phone)

    if (linkError) {
      console.warn('[vendor-auth] profile id link skipped:', linkError.message)
      return byPhone as RestaurantDesktopProfile & { phone_verified?: boolean }
    }

    return { ...byPhone, id: authUserId } as RestaurantDesktopProfile & {
      phone_verified?: boolean
    }
  }

  return byPhone as RestaurantDesktopProfile & { phone_verified?: boolean }
}

async function resolveAuthenticatedProfile(
  supabase: SupabaseClient,
  authUser: User,
  expectedPhone: string,
): Promise<(RestaurantDesktopProfile & { phone_verified?: boolean }) | null> {
  if (!phonesMatch(authUser.phone, expectedPhone)) {
    console.warn('[vendor-auth] auth phone mismatch', authUser.phone, expectedPhone)
    return null
  }

  return findProfileForAuthUser(supabase, authUser.id, expectedPhone)
}

function toProfile(
  profile: RestaurantDesktopProfile & { phone_verified?: boolean },
): RestaurantDesktopProfile {
  return {
    id: profile.id,
    username: profile.username,
    phone: profile.phone,
    name: profile.name,
    business_name: profile.business_name,
    role: profile.role,
    vendor_type: profile.vendor_type,
    premium_status: profile.premium_status,
    subscription_tier: profile.subscription_tier ?? null,
    avatar_url: profile.avatar_url,
    email: profile.email,
  }
}

export async function verifyRestaurantDesktopOtp(
  supabase: SupabaseClient,
  phone: string,
  otp: string,
  email?: string,
): Promise<
  | { ok: true; profile: RestaurantDesktopProfile; isTestSession?: boolean }
  | { ok: false; message: string }
> {
  const formattedPhone = formatPhoneNumber(phone)

  if (isTestPhoneNumber(formattedPhone)) {
    return verifyTestRestaurantDesktopOtp(supabase, phone, otp, email)
  }

  const { data, error } = await supabase.auth.verifyOtp({
    phone: formattedPhone,
    token: otp.trim(),
    type: 'sms',
  })

  if (error || !data.user) {
    console.error('[vendor-auth] verify OTP failed:', error?.message)
    return { ok: false, message: AUTH_ERRORS.verifyFailed }
  }

  if (!data.session) {
    return { ok: false, message: AUTH_ERRORS.sessionExpired }
  }

  const profile = await resolveAuthenticatedProfile(
    supabase,
    data.user,
    formattedPhone,
  )

  if (!profile) {
    await supabase.auth.signOut({ scope: 'local' })
    return { ok: false, message: AUTH_ERRORS.noProfile }
  }

  const subscription = await loadSubscriptionEntitlement(supabase, profile.id)
  if (!canAccessRestaurantDesktop(profile, subscription)) {
    await supabase.auth.signOut({ scope: 'local' })
    return {
      ok: false,
      message: getDesktopAccessDenialMessage(profile, subscription),
    }
  }

  if (profile.phone_verified === false) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        phone_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)

    if (updateError) {
      console.warn('[vendor-auth] phone_verified update skipped:', updateError.message)
    }
  }

  return { ok: true, profile: toProfile(profile) }
}

export async function getRestaurantDesktopProfileForUser(
  supabase: SupabaseClient,
  user: User,
): Promise<RestaurantDesktopProfile | null> {
  if (!user.phone) {
    return null
  }

  const profile = await findProfileForAuthUser(supabase, user.id, user.phone)

  if (!profile || !phonesMatch(profile.phone, user.phone)) {
    return null
  }

  if (!canAccessRestaurantDesktop(profile, await loadSubscriptionEntitlement(supabase, profile.id))) {
    return null
  }

  return toProfile(profile)
}

export async function getAuthenticatedRestaurantDesktopProfile(
  supabase: SupabaseClient,
): Promise<RestaurantDesktopProfile | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user?.phone) {
    return null
  }

  return getRestaurantDesktopProfileForUser(supabase, user)
}
