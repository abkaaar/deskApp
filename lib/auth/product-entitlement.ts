/**
 * Shared product entitlement helpers for Foodpos.
 */

export type EntitlementProfile = {
  id?: string | null
  role?: string | null
  premium_status?: string | null
  vendor_type?: string | null
}

export type EntitlementSubscription = {
  status?: string | null
  trial_ends_at?: string | null
  current_period_end?: string | null
}

export const TRIAL_DAYS = 3

export const DEMO_VENDOR_USER_ID =
  '00000000-0000-0000-0000-000000000123'

export function isDemoVendorUserId(id?: string | null): boolean {
  return Boolean(id && id === DEMO_VENDOR_USER_ID)
}

export function isSubscriptionEntitled(
  subscription: EntitlementSubscription | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!subscription?.status) return false
  const status = subscription.status.toLowerCase()

  if (status === 'active' || status === 'grace') return true

  if (status === 'trialing') {
    if (!subscription.trial_ends_at) return false
    return new Date(subscription.trial_ends_at).getTime() > now.getTime()
  }

  if (
    (status === 'cancelled' || status === 'expired' || status === 'past_due') &&
    subscription.current_period_end
  ) {
    return new Date(subscription.current_period_end).getTime() > now.getTime()
  }

  return false
}

export function canUseProduct(
  profile: EntitlementProfile,
  subscription?: EntitlementSubscription | null,
  now: Date = new Date(),
): boolean {
  if (profile.role !== 'premium') return false
  if (profile.premium_status && profile.premium_status !== 'premium') {
    return false
  }
  if (isSubscriptionEntitled(subscription, now)) return true
  return isDemoVendorUserId(profile.id)
}

export function canUseDesktopOrPos(
  profile: EntitlementProfile,
  subscription?: EntitlementSubscription | null,
  now: Date = new Date(),
): boolean {
  const isDemo = isDemoVendorUserId(profile.id)
  if (profile.vendor_type?.toLowerCase() !== 'restaurant' && !isDemo) {
    return false
  }
  if (isDemo && profile.vendor_type?.toLowerCase() !== 'restaurant') {
    return profile.role === 'premium'
  }
  return canUseProduct(profile, subscription, now)
}

export function getTrialEndsAtIso(from: Date = new Date()): string {
  const end = new Date(from)
  end.setUTCDate(end.getUTCDate() + TRIAL_DAYS)
  return end.toISOString()
}

export function daysLeftInTrial(
  trialEndsAt: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!trialEndsAt) return null
  const ms = new Date(trialEndsAt).getTime() - now.getTime()
  if (ms <= 0) return 0
  return Math.ceil(ms / (24 * 60 * 60 * 1000))
}
