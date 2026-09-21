import type { EntitlementProfile, EntitlementSubscription } from './product-entitlement'
import {
  canUseDesktopOrPos as canUseDesktopOrPosCore,
  canUseProduct,
  isSubscriptionEntitled,
} from './product-entitlement'
import { webBrandHost } from '@/lib/web-domain'

export type { EntitlementProfile, EntitlementSubscription }
export {
  canUseProduct,
  isSubscriptionEntitled,
  TRIAL_DAYS,
  daysLeftInTrial,
  getTrialEndsAtIso,
} from './product-entitlement'

/** Restaurant desktop: approved restaurant + entitled (trial/active). */
export function canAccessRestaurantDesktop(
  profile: EntitlementProfile & { vendor_type: string | null },
  subscription?: EntitlementSubscription | null,
): boolean {
  return canUseDesktopOrPosCore(profile, subscription)
}

export function getDesktopAccessDenialMessage(
  profile: EntitlementProfile & { vendor_type: string | null },
  subscription?: EntitlementSubscription | null,
): string {
  if (profile.role?.toLowerCase() !== 'premium') {
    return 'Foodma Restaurant Desktop requires an approved premium restaurant account.'
  }
  if (profile.vendor_type?.toLowerCase() !== 'restaurant') {
    return 'This app is for restaurant businesses only. Other vendor types should use the Foodma mobile app.'
  }
  if (!canUseProduct(profile, subscription)) {
    return `Your trial or subscription is inactive. Subscribe on ${webBrandHost()} to continue using Desktop.`
  }
  return 'Your account does not have access to Foodma Restaurant Desktop.'
}
