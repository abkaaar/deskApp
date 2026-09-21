import type { SupabaseClient } from '@supabase/supabase-js'

import {
  canAccessRestaurantDesktop,
} from '@/lib/auth/desktop-access'
import { findProfileByPhone } from '@/lib/auth/profile-lookup'
import { DESKTOP_TEST_SESSION_KEY } from '@/lib/auth/test-auth'
import type { RestaurantDesktopProfile } from '@/lib/auth/vendor-auth'

async function loadSubscription(
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

export async function persistTestSession(
  profile: RestaurantDesktopProfile,
): Promise<void> {
  await window.api.settings.set(
    DESKTOP_TEST_SESSION_KEY,
    JSON.stringify(profile),
  )
}

export async function clearTestSession(): Promise<void> {
  await window.api.settings.set(DESKTOP_TEST_SESSION_KEY, '')
}

export async function loadPersistedTestSession(
  supabase?: SupabaseClient,
): Promise<RestaurantDesktopProfile | null> {
  const raw = await window.api.settings.get(DESKTOP_TEST_SESSION_KEY)
  if (!raw) return null

  try {
    const cached = JSON.parse(raw) as RestaurantDesktopProfile
    if (!cached?.id) {
      await clearTestSession()
      return null
    }

    if (supabase && cached.phone) {
      const fresh = await findProfileByPhone(supabase, cached.phone)
      if (fresh) {
        const subscription = await loadSubscription(supabase, fresh.id)
        if (canAccessRestaurantDesktop(fresh, subscription)) {
          await persistTestSession(fresh)
          return fresh
        }
        await clearTestSession()
        return null
      }
    }

    if (supabase) {
      const subscription = await loadSubscription(supabase, cached.id)
      if (!canAccessRestaurantDesktop(cached, subscription)) {
        await clearTestSession()
        return null
      }
      return cached
    }

    // Offline / no client: cannot verify billing — drop the session.
    await clearTestSession()
    return null
  } catch {
    await clearTestSession()
    return null
  }
}
