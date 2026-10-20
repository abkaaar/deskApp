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
  maskedEmail: string
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

const INIT_TIMEOUT_MS = 12_000

let authSubscription: { unsubscribe: () => void } | null = null
let initializePromise: Promise<void> | null = null

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

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
  maskedEmail: '',
  initialized: false,

  hasPermission: (permission) => {
    const { actor, permissions } = get()
    if (actor === 'owner') return true
    if (!permissions) return false
    return permissions.includes(permission)
  },

  initialize: async () => {
    if (get().initialized) return
    if (initializePromise) return initializePromise

    initializePromise = (async () => {
      try {
        const supabase = getSupabaseClient()

        const staffSession = await withTimeout(
          loadPersistedStaffSession(),
          INIT_TIMEOUT_MS,
          'staff session restore',
        )
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

        const testProfile = await withTimeout(
          loadPersistedTestSession(supabase),
          INIT_TIMEOUT_MS,
          'test session restore',
        )
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
                  initialized: true,
                })
              } else {
                // Entitlement lost on refresh (revoke / expired) — same as SIGNED_IN denial.
                await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
                await window.api.auth.clearAll().catch(() => undefined)
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
              }
            }
          })
          authSubscription = data.subscription
        }

        const {
          data: { session },
        } = await withTimeout(supabase.auth.getSession(), INIT_TIMEOUT_MS, 'getSession')

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

        const profile = await withTimeout(
          getAuthenticatedRestaurantDesktopProfile(supabase),
          INIT_TIMEOUT_MS,
          'profile restore',
        )
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
      } finally {
        initializePromise = null
      }
    })()

    return initializePromise
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
      pendingEmail: result.email,
      maskedEmail: result.maskedEmail,
      error: null,
    })
    return true
  },

  verifyOtp: async (otp: string) => {
    const { pendingEmail } = get()
    if (!pendingEmail) {
      set({ error: AUTH_ERRORS.sessionExpired })
      return false
    }

    set({ error: null })
    try {
      const supabase = getSupabaseClient()
      const result = await verifyRestaurantDesktopOtp(
        supabase,
        pendingEmail,
        otp,
      )

      if (!result.ok) {
        set({ error: result.message, initialized: true })
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
        maskedEmail: '',
        initialized: true,
      })
      return true
    } catch (error) {
      console.error('[authStore] verifyOtp failed:', error)
      set({
        error: AUTH_ERRORS.verifyFailed,
        initialized: true,
      })
      return false
    }
  },

  signInStaff: async (email: string, code: string) => {
    set({ error: null })
    try {
      const result = await requestStaffSignIn(email, code)
      if (!result.ok) {
        set({ error: result.message, initialized: true })
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
        maskedEmail: '',
        initialized: true,
      })
      return true
    } catch (error) {
      console.error('[authStore] signInStaff failed:', error)
      set({
        error: 'Staff sign-in failed. Please try again.',
        initialized: true,
      })
      return false
    }
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
      maskedEmail: '',
      initialized: true,
    })
  },

  clearError: () => set({ error: null }),

  resetPending: () =>
    set({
      pendingEmail: '',
      maskedEmail: '',
      error: null,
    }),
}))
