import type { RestaurantDesktopProfile } from '@/lib/auth/vendor-auth'
import type { VendorStaffPermission, VendorStaffRole } from '@/lib/vendor-staff-permissions'

export type StaffSessionActor = {
  actor: 'staff'
  accessToken: string
  expiresAt: string
  vendor: RestaurantDesktopProfile
  staff: {
    id: string
    full_name: string
    role: VendorStaffRole
    permissions: VendorStaffPermission[]
  }
}

type StaffSignInResult =
  | { ok: true; session: StaffSessionActor }
  | { ok: false; message: string }

function supabaseFunctionsUrl(): string {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '')
  return `${base}/functions/v1/staff-sign-in`
}

export async function requestStaffSignIn(
  email: string,
  code: string,
): Promise<StaffSignInResult> {
  try {
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
    const res = await fetch(supabaseFunctionsUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(anon ? { Authorization: `Bearer ${anon}`, apikey: anon } : {}),
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        code: code.trim().toUpperCase(),
        client: 'desktop',
      }),
    })

    const payload = (await res.json().catch(() => ({}))) as {
      success?: boolean
      error?: string
      access_token?: string
      expires_at?: string
      vendor?: Record<string, unknown>
      staff?: {
        id: string
        full_name: string
        role: string
        permissions: string[]
      }
    }

    if (!res.ok || !payload.success || !payload.access_token || !payload.vendor || !payload.staff) {
      return {
        ok: false,
        message: payload.error || 'Invalid email or access code',
      }
    }

    const v = payload.vendor
    const session: StaffSessionActor = {
      actor: 'staff',
      accessToken: payload.access_token,
      expiresAt: payload.expires_at || new Date(Date.now() + 12 * 3600_000).toISOString(),
      vendor: {
        id: String(v.id),
        username: String(v.username || ''),
        phone: String(v.phone || ''),
        name: (v.name as string | null) ?? null,
        business_name: (v.business_name as string | null) ?? null,
        role: (v.role as string | null) ?? null,
        vendor_type: (v.vendor_type as string | null) ?? null,
        premium_status: (v.premium_status as string | null) ?? null,
        subscription_tier: null,
        avatar_url: (v.avatar_url as string | null) ?? null,
        email: (v.email as string | null) ?? null,
      },
      staff: {
        id: payload.staff.id,
        full_name: payload.staff.full_name,
        role: payload.staff.role as VendorStaffRole,
        permissions: payload.staff.permissions as VendorStaffPermission[],
      },
    }

    return { ok: true, session }
  } catch (error) {
    console.error('[staff-sign-in]', error)
    return { ok: false, message: 'Could not reach sign-in service' }
  }
}

const STAFF_SESSION_KEY = 'foodma_desktop_staff_session'

export async function persistStaffSession(session: StaffSessionActor): Promise<void> {
  await window.api.settings.set(STAFF_SESSION_KEY, JSON.stringify(session))
}

export async function loadPersistedStaffSession(): Promise<StaffSessionActor | null> {
  try {
    const raw = await window.api.settings.get(STAFF_SESSION_KEY)
    if (!raw || typeof raw !== 'string') return null
    const parsed = JSON.parse(raw) as StaffSessionActor
    if (parsed.actor !== 'staff' || !parsed.accessToken || !parsed.vendor?.id) return null
    if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() < Date.now()) {
      await clearPersistedStaffSession()
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export async function clearPersistedStaffSession(): Promise<void> {
  await window.api.settings.set(STAFF_SESSION_KEY, '')
}
