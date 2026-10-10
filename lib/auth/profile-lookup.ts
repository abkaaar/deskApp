import type { SupabaseClient } from '@supabase/supabase-js'

import { formatPhoneNumber } from '@/lib/auth/phone'
import type { RestaurantDesktopProfile } from '@/lib/auth/vendor-auth'

export const PROFILE_FIELDS =
  'id, username, phone, name, business_name, role, premium_status, subscription_tier, avatar_url, email, phone_verified, email_verified, vendor_type'

function phoneDigits(phone: string): string {
  return formatPhoneNumber(phone).replace(/\D/g, '')
}

export function phonesMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a || !b) return false
  return phoneDigits(a) === phoneDigits(b)
}

export function emailsMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const left = (a || '').trim().toLowerCase()
  const right = (b || '').trim().toLowerCase()
  return Boolean(left && right && left === right)
}

function toProfile(row: Record<string, unknown>): RestaurantDesktopProfile {
  return {
    id: row.id as string,
    username: row.username as string,
    phone: row.phone as string,
    name: (row.name as string | null) ?? null,
    business_name: (row.business_name as string | null) ?? null,
    role: (row.role as string | null) ?? null,
    vendor_type: (row.vendor_type as string | null) ?? null,
    premium_status: (row.premium_status as string | null) ?? null,
    subscription_tier: (row.subscription_tier as string | null) ?? null,
    avatar_url: (row.avatar_url as string | null) ?? null,
    email: (row.email as string | null) ?? null,
  }
}

/**
 * Find a profile by phone using the same flexible matching as foodma-web vendor-auth.
 */
export async function findProfileByPhone(
  supabase: SupabaseClient,
  phone: string,
): Promise<RestaurantDesktopProfile | null> {
  const formattedPhone = formatPhoneNumber(phone)
  const targetDigits = phoneDigits(formattedPhone)

  const { data: rows, error } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .or(
      `phone.eq.${formattedPhone},phone.eq.${formattedPhone.slice(1)},phone.ilike.%${targetDigits.slice(-10)}`,
    )
    .limit(10)

  if (error) {
    console.warn('[profile-lookup] phone lookup failed:', error.message)
    return null
  }

  const match = rows?.find((row) => phonesMatch(row.phone, formattedPhone)) ?? null
  return match ? toProfile(match) : null
}

/**
 * Find profile by email (case-insensitive).
 */
export async function findProfileByEmail(
  supabase: SupabaseClient,
  email: string,
): Promise<RestaurantDesktopProfile | null> {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) return null

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .ilike('email', normalizedEmail)
    .limit(5)

  if (error) {
    console.warn('[profile-lookup] email lookup failed:', error.message)
    return null
  }

  const match =
    data?.find(
      (row) => row.email?.trim().toLowerCase() === normalizedEmail,
    ) ?? null

  return match ? toProfile(match) : null
}

/**
 * Resolve profile by phone first, then email fallback (sign-in flow).
 */
export async function findProfileByPhoneOrEmail(
  supabase: SupabaseClient,
  phone: string,
  email?: string,
): Promise<RestaurantDesktopProfile | null> {
  const byPhone = await findProfileByPhone(supabase, phone)
  if (byPhone) return byPhone

  if (email) {
    return findProfileByEmail(supabase, email)
  }

  return null
}
