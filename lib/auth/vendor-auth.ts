import type { SupabaseClient, User } from '@supabase/supabase-js'

import { AUTH_ERRORS } from '@/lib/auth/auth-security'
import {
  canAccessRestaurantDesktop,
  getDesktopAccessDenialMessage,
} from '@/lib/auth/desktop-access'
import {
  emailsMatch,
  findProfileByEmail,
  PROFILE_FIELDS,
} from '@/lib/auth/profile-lookup'
import { isTestEmail } from '@/lib/auth/test-auth'
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
  authUserId?: string | null,
) {
  const { data, error } = await supabase
    .from('vendor_subscriptions')
    .select('status, trial_ends_at, current_period_end')
    .eq('vendor_id', vendorId)
    .maybeSingle()

  if (error) {
    console.warn('[vendor-auth] subscription lookup failed:', error.message)
  }
  if (data) return data

  // Soft-migrate: auth.uid may differ from profiles.id; try session uid as fallback.
  if (authUserId && authUserId !== vendorId) {
    const { data: byAuth, error: byAuthError } = await supabase
      .from('vendor_subscriptions')
      .select('status, trial_ends_at, current_period_end')
      .eq('vendor_id', authUserId)
      .maybeSingle()
    if (byAuthError) {
      console.warn(
        '[vendor-auth] subscription lookup by auth id failed:',
        byAuthError.message,
      )
    }
    if (byAuth) return byAuth
  }

  return data
}

async function findProfileForAuthUser(
  supabase: SupabaseClient,
  authUserId: string,
  email: string,
): Promise<(RestaurantDesktopProfile & { email_verified?: boolean }) | null> {
  const normalizedEmail = email.trim().toLowerCase()

  const { data: byId, error: byIdError } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .eq('id', authUserId)
    .maybeSingle()

  if (byIdError) {
    console.warn('[vendor-auth] profile lookup by id failed:', byIdError.message)
  }
  if (byId && emailsMatch(byId.email, normalizedEmail)) {
    return byId as RestaurantDesktopProfile & { email_verified?: boolean }
  }
  if (byId?.id === authUserId) {
    return byId as RestaurantDesktopProfile & { email_verified?: boolean }
  }

  const byEmail = await findProfileByEmail(supabase, normalizedEmail)
  if (!byEmail) {
    return null
  }

  if (byEmail.id !== authUserId) {
    const { error: linkError } = await supabase
      .from('profiles')
      .update({
        id: authUserId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', byEmail.id)

    if (linkError) {
      console.warn('[vendor-auth] profile id link skipped:', linkError.message)
      return byEmail as RestaurantDesktopProfile & { email_verified?: boolean }
    }

    return { ...byEmail, id: authUserId } as RestaurantDesktopProfile & {
      email_verified?: boolean
    }
  }

  return byEmail as RestaurantDesktopProfile & { email_verified?: boolean }
}

async function resolveAuthenticatedProfile(
  supabase: SupabaseClient,
  authUser: User,
  expectedEmail: string,
): Promise<(RestaurantDesktopProfile & { email_verified?: boolean }) | null> {
  const authEmail = (authUser.email || '').trim().toLowerCase()
  if (authEmail && !emailsMatch(authEmail, expectedEmail)) {
    console.warn('[vendor-auth] auth email mismatch', authEmail, expectedEmail)
    return null
  }

  return findProfileForAuthUser(supabase, authUser.id, expectedEmail)
}

function toProfile(
  profile: RestaurantDesktopProfile & { email_verified?: boolean },
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
  email: string,
  otp: string,
): Promise<
  | { ok: true; profile: RestaurantDesktopProfile; isTestSession?: boolean }
  | { ok: false; message: string }
> {
  const normalizedEmail = email.trim().toLowerCase()

  if (isTestEmail(normalizedEmail)) {
    return verifyTestRestaurantDesktopOtp(supabase, normalizedEmail, otp)
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email: normalizedEmail,
    token: otp.trim(),
    type: 'email',
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
    normalizedEmail,
  )

  if (!profile) {
    await supabase.auth.signOut({ scope: 'local' })
    return { ok: false, message: AUTH_ERRORS.noProfile }
  }

  const subscription = await loadSubscriptionEntitlement(
    supabase,
    profile.id,
    data.user.id,
  )
  if (!canAccessRestaurantDesktop(profile, subscription)) {
    await supabase.auth.signOut({ scope: 'local' })
    return {
      ok: false,
      message: getDesktopAccessDenialMessage(profile, subscription),
    }
  }

  if (profile.email_verified === false) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        email_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)

    if (updateError) {
      console.warn('[vendor-auth] email_verified update skipped:', updateError.message)
    }
  }

  return { ok: true, profile: toProfile(profile) }
}

export async function getRestaurantDesktopProfileForUser(
  supabase: SupabaseClient,
  user: User,
): Promise<RestaurantDesktopProfile | null> {
  const email = (user.email || '').trim().toLowerCase()
  if (!email && !user.id) {
    return null
  }

  const profile = email
    ? await findProfileForAuthUser(supabase, user.id, email)
    : (
        await supabase
          .from('profiles')
          .select(PROFILE_FIELDS)
          .eq('id', user.id)
          .maybeSingle()
      ).data

  if (!profile) {
    return null
  }

  const subscription = await loadSubscriptionEntitlement(
    supabase,
    profile.id,
    user.id,
  )
  if (!canAccessRestaurantDesktop(profile, subscription)) {
    return null
  }

  return toProfile(profile as RestaurantDesktopProfile & { email_verified?: boolean })
}

export async function getAuthenticatedRestaurantDesktopProfile(
  supabase: SupabaseClient,
): Promise<RestaurantDesktopProfile | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return null
  }

  return getRestaurantDesktopProfileForUser(supabase, user)
}
