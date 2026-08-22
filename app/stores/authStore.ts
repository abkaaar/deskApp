import { create } from 'zustand'

import { AUTH_ERRORS } from '@/lib/auth/auth-security'
import { isTestProfile } from '@/lib/auth/test-auth'
import {
  clearTestSession,
  loadPersistedTestSession,
  persistTestSession,
} from '@/lib/auth/test-session'
import { requestEmailSignInOtp } from '@/lib/auth/email-sign-in'
import {
  clearPersistedStaffSession,
  loadPersistedStaffSession,
  persistStaffSession,
  requestStaffSignIn,
  type StaffSessionActor,
} from '@/lib/auth/staff-sign-in'
import {
  getAuthenticatedRestaurantDesktopProfile,
  verifyRestaurantDesktopOtp,
  type RestaurantDesktopProfile,
} from '@/lib/auth/vendor-auth'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { VendorStaffPermission } from '@/lib/vendor-staff-permissions'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'
export type AuthActor = 'owner' | 'staff'

type AuthState = {
  status: AuthStatus
  profile: RestaurantDesktopProfile | null
  actor: AuthActor
  staff: StaffSessionActor['staff'] | null
  permissions: VendorStaffPermission[] | null
  isTestSession: boolean
  error: string | null
  pendingEmail: string
  pendingPhone: string
  maskedPhone: string
  initialized: boolean
  initialize: () => Promise<void>
  sendOtp: (email: string) => Promise<boolean>
  verifyOtp: (otp: string) => Promise<boolean>
  signInStaff: (email: string, code: string) => Promise<boolean>
  signOut: () => Promise<void>
  clearError: () => void
  resetPending: () => void
  hasPermission: (permission: VendorStaffPermission) => boolean
}

let authSubscription: { unsubscribe: () => void } | null = null

async function persistUxMetadata(profile: RestaurantDesktopProfile): Promise<void> {
  await window.api.settings.set('last_vendor_id', profile.id)
  if (profile.email) {
    await window.api.settings.set('last_email', profile.email)
  }
}

async function clearUxMetadata(): Promise<void> {
  await window.api.settings.set('last_vendor_id', '')
  await window.api.settings.set('last_email', '')
}

async function applyStaffAccessToken(accessToken: string): Promise<void> {
  const supabase = getSupabaseClient()
  await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: accessToken,
  })
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  profile: null,
  actor: 'owner',
  staff: null,
  permissions: null,
  isTestSession: false,
  error: null,
  pendingEmail: '',
  pendingPhone: '',
  maskedPhone: '',
  initialized: false,

  hasPermission: (permission) => {
    const { actor, permissions } = get()
    if (actor === 'owner') return true
    if (!permissions) return false
    return permissions.includes(permission)
  },

  initialize: async () => {
    if (get().initialized) return

    try {
      const supabase = getSupabaseClient()

      const staffSession = await loadPersistedStaffSession()
      if (staffSession) {
        await applyStaffAccessToken(staffSession.accessToken)
        await persistUxMetadata(staffSession.vendor)
        set({
          status: 'authenticated',
          profile: staffSession.vendor,
          actor: 'staff',
          staff: staffSession.staff,
          permissions: staffSession.staff.permissions,
          isTestSession: false,
          error: null,
          initialized: true,
        })
        return
      }

      const testProfile = await loadPersistedTestSession(supabase)
      if (testProfile) {
        await persistUxMetadata(testProfile)
        set({
          status: 'authenticated',
          profile: testProfile,
          actor: 'owner',
          staff: null,
          permissions: null,
          isTestSession: true,
          error: null,
          initialized: true,
        })
        return
      }

      if (!authSubscription) {
        const { data } = supabase.auth.onAuthStateChange(async (event) => {
          if (get().actor === 'staff') return

          if (event === 'SIGNED_OUT') {
            set({
              status: 'unauthenticated',
              profile: null,
              actor: 'owner',
              staff: null,
              permissions: null,
              isTestSession: false,
              error: null,
            })
            return
          }

          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            const profile = await getAuthenticatedRestaurantDesktopProfile(supabase)
            if (profile) {
              await clearTestSession()
              await persistUxMetadata(profile)
              set({
                status: 'authenticated',
                profile,
                actor: 'owner',
                staff: null,
                permissions: null,
                isTestSession: false,
                error: null,
              })
            }
          }
        })
        authSubscription = data.subscription
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        set({
          status: 'unauthenticated',
          profile: null,
          actor: 'owner',
          staff: null,
          permissions: null,
          isTestSession: false,
          initialized: true,
        })
        return
      }

      const profile = await getAuthenticatedRestaurantDesktopProfile(supabase)
      if (!profile) {
        await supabase.auth.signOut({ scope: 'local' })
        await window.api.auth.clearAll()
        set({
          status: 'unauthenticated',
          profile: null,
          actor: 'owner',
          staff: null,
          permissions: null,
          isTestSession: false,
          error: AUTH_ERRORS.noDesktopAccess,
          initialized: true,
        })
        return
      }

      await persistUxMetadata(profile)
      set({
        status: 'authenticated',
        profile,
        actor: 'owner',
        staff: null,
        permissions: null,
        isTestSession: false,
        error: null,
        initialized: true,
      })
    } catch (error) {
      console.error('[authStore] initialize failed:', error)
      set({
        status: 'unauthenticated',
        profile: null,
        actor: 'owner',
        staff: null,
        permissions: null,
        isTestSession: false,
        error: 'Could not restore your session. Please sign in again.',
        initialized: true,
      })
    }
  },

  sendOtp: async (email: string) => {
    set({ error: null })
    const result = await requestEmailSignInOtp(email)

    if (!result.ok) {
      const message =
        result.code === 'not_registered'
          ? AUTH_ERRORS.emailNotRegistered
          : result.message
      set({ error: message })
      return false
    }

    set({
      pendingEmail: email.trim().toLowerCase(),
      pendingPhone: result.phone,
      maskedPhone: result.maskedPhone,
      error: null,
    })
    return true
  },

  verifyOtp: async (otp: string) => {
    const { pendingPhone, pendingEmail } = get()
    if (!pendingPhone) {
      set({ error: AUTH_ERRORS.sessionExpired })
      return false
    }

    set({ error: null })
    const supabase = getSupabaseClient()
    const result = await verifyRestaurantDesktopOtp(
      supabase,
      pendingPhone,
      otp,
      pendingEmail,
    )

    if (!result.ok) {
      set({ error: result.message })
      return false
    }

    const isTestSession = result.isTestSession === true
    await clearPersistedStaffSession()

    if (isTestSession) {
      await persistTestSession(result.profile)
    } else {
      await clearTestSession()
    }

    await persistUxMetadata(result.profile)
    set({
      status: 'authenticated',
      profile: result.profile,
      actor: 'owner',
      staff: null,
      permissions: null,
      isTestSession,
      error: null,
      pendingEmail: '',
      pendingPhone: '',
      maskedPhone: '',
    })
    return true
  },

  signInStaff: async (email: string, code: string) => {
    set({ error: null })
    const result = await requestStaffSignIn(email, code)
    if (!result.ok) {
      set({ error: result.message })
      return false
    }

    await clearTestSession()
    await applyStaffAccessToken(result.session.accessToken)
    await persistStaffSession(result.session)
    await persistUxMetadata(result.session.vendor)

    set({
      status: 'authenticated',
      profile: result.session.vendor,
      actor: 'staff',
      staff: result.session.staff,
      permissions: result.session.staff.permissions,
      isTestSession: false,
      error: null,
      pendingEmail: '',
      pendingPhone: '',
      maskedPhone: '',
    })
    return true
  },

  signOut: async () => {
    const { profile, isTestSession, actor } = get()
    const supabase = getSupabaseClient()

    await clearPersistedStaffSession()

    if (actor === 'owner' && !isTestSession && profile && !isTestProfile(profile)) {
      await supabase.auth.signOut({ scope: 'local' })
      await window.api.auth.clearAll()
    } else {
      await supabase.auth.signOut({ scope: 'local' })
    }

    await clearTestSession()
    await clearUxMetadata()
    set({
      status: 'unauthenticated',
      profile: null,
      actor: 'owner',
      staff: null,
      permissions: null,
      isTestSession: false,
      error: null,
      pendingEmail: '',
      pendingPhone: '',
      maskedPhone: '',
    })
  },

  clearError: () => set({ error: null }),

  resetPending: () =>
    set({
      pendingEmail: '',
      pendingPhone: '',
      maskedPhone: '',
      error: null,
    }),
}))
