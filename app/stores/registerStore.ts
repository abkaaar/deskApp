import { create } from 'zustand'

import {
  closeRegisterSession,
  getOpenRegisterSession,
  lastFloatStorageKey,
  openRegisterSession,
  recordRegisterRefund,
  recordRegisterSale,
  terminalStorageKey,
} from '@/lib/register/registerSessionService'
import type {
  RegisterPaymentMethod,
  RegisterSession,
} from '@/lib/register/types'

type RegisterState = {
  session: RegisterSession | null
  loading: boolean
  initialized: boolean
  error: string | null
  initialize: (vendorId: string) => Promise<void>
  open: (input: {
    vendorId: string
    terminalId: string
    terminalName: string
    cashierUserId: string
    cashierName: string
    openingFloat: number
    openingNote?: string
  }) => Promise<boolean>
  close: (input: {
    vendorId: string
    countedCash: number
    closingNote?: string
    actorId?: string
  }) => Promise<boolean>
  refresh: (vendorId: string) => Promise<void>
  recordSale: (input: {
    vendorId: string
    actorId?: string
    orderId: string
    method: RegisterPaymentMethod
    amount: number
    hold?: boolean
  }) => Promise<void>
  recordRefund: (input: {
    vendorId: string
    actorId?: string
    orderId: string
    method: RegisterPaymentMethod
    amount: number
  }) => Promise<void>
  clearError: () => void
}

export const useRegisterStore = create<RegisterState>((set, get) => ({
  session: null,
  loading: false,
  initialized: false,
  error: null,

  initialize: async (vendorId) => {
    if (!vendorId) {
      set({ session: null, initialized: true, loading: false })
      return
    }
    set({ loading: true, error: null })
    try {
      const savedTerminal =
        typeof localStorage !== 'undefined'
          ? localStorage.getItem(terminalStorageKey(vendorId))
          : null
      const session = await getOpenRegisterSession(vendorId, savedTerminal)
      set({ session, initialized: true, loading: false })
    } catch (e) {
      set({
        session: null,
        initialized: true,
        loading: false,
        error: e instanceof Error ? e.message : 'Could not load register',
      })
    }
  },

  open: async (input) => {
    set({ loading: true, error: null })
    try {
      const session = await openRegisterSession(input)
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(terminalStorageKey(input.vendorId), input.terminalId)
        localStorage.setItem(
          lastFloatStorageKey(input.vendorId),
          String(input.openingFloat),
        )
      }
      set({ session, loading: false, initialized: true })
      return true
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Could not open register',
      })
      return false
    }
  },

  close: async (input) => {
    const session = get().session
    if (!session) {
      set({ error: 'No open register session' })
      return false
    }
    set({ loading: true, error: null })
    try {
      await closeRegisterSession({
        sessionId: session.id,
        vendorId: input.vendorId,
        countedCash: input.countedCash,
        closingNote: input.closingNote,
        actorId: input.actorId,
      })
      set({ session: null, loading: false })
      return true
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Could not close register',
      })
      return false
    }
  },

  refresh: async (vendorId) => {
    const current = get().session
    try {
      const session = await getOpenRegisterSession(
        vendorId,
        current?.terminal_id ?? null,
      )
      set({ session })
    } catch {
      /* keep local session */
    }
  },

  recordSale: async (input) => {
    const session = get().session
    if (!session) return
    const updated = await recordRegisterSale({
      sessionId: session.id,
      vendorId: input.vendorId,
      actorId: input.actorId,
      orderId: input.orderId,
      method: input.method,
      amount: input.amount,
      hold: input.hold,
    })
    if (updated) set({ session: updated })
  },

  recordRefund: async (input) => {
    const session = get().session
    if (!session) return
    const updated = await recordRegisterRefund({
      sessionId: session.id,
      vendorId: input.vendorId,
      actorId: input.actorId,
      orderId: input.orderId,
      method: input.method,
      amount: input.amount,
    })
    if (updated) set({ session: updated })
  },

  clearError: () => set({ error: null }),
}))
