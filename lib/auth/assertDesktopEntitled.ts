import { canUseDesktopOrPos } from '@/lib/auth/product-entitlement'
import { getSupabaseClient } from '@/lib/supabase/client'
import { webBrandHost } from '@/lib/web-domain'

const INACTIVE_MESSAGE = `Your trial or subscription is inactive. Subscribe on ${webBrandHost()} to continue using Desktop.`

export async function assertDesktopEntitled(
  vendorId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()
  const authUserId = session?.user?.id ?? null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, premium_status, vendor_type')
    .eq('id', vendorId)
    .maybeSingle()

  if (!profile) {
    return { ok: false, error: 'Vendor profile not found' }
  }

  let { data: subscription } = await supabase
    .from('vendor_subscriptions')
    .select('status, trial_ends_at, current_period_end')
    .eq('vendor_id', vendorId)
    .maybeSingle()

  // Soft-migrate: auth.uid may differ from profiles.id; try session uid as fallback.
  if (!subscription && authUserId && authUserId !== vendorId) {
    const { data: byAuth } = await supabase
      .from('vendor_subscriptions')
      .select('status, trial_ends_at, current_period_end')
      .eq('vendor_id', authUserId)
      .maybeSingle()
    subscription = byAuth
  }

  if (!canUseDesktopOrPos({ ...profile, id: vendorId }, subscription)) {
    return { ok: false, error: INACTIVE_MESSAGE }
  }

  return { ok: true }
}
