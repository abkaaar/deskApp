import { create } from 'zustand'

import type { CartLine, MenuAddon, MenuPost, OrderType, PaymentMethod } from '@/lib/checkout/types'

export type CheckoutMode = 'keypad' | 'menu' | 'favorites'

export type { PaymentMethod }

function lineSubtotal(price: number, quantity: number): number {
  return Math.round(price * quantity)
}

function computeSubtotal(cart: CartLine[]): number {
  return cart.reduce((sum, line) => sum + line.subtotal, 0)
}

function favoritesKey(vendorId: string): string {
  return `foodma.checkout.favorites.${vendorId}`
}

export function loadFavoriteIds(vendorId: string): string[] {
  if (!vendorId || typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(favoritesKey(vendorId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function saveFavoriteIds(vendorId: string, ids: string[]): void {
  if (!vendorId || typeof localStorage === 'undefined') return
  localStorage.setItem(favoritesKey(vendorId), JSON.stringify(ids))
}

export type SaleSubmitSnapshot = {
  orderType: OrderType
  lineItems: {
    post_id: string
    quantity: number
    unit_price: number
    subtotal: number
    notes?: string
    is_custom?: boolean
    fulfilment_mode?: 'ready' | 'made_to_order'
    title?: string
    selected_addons?: {
      id: string
      title: string
      price: number
      quantity: number
    }[]
  }[]
  subtotal: number
  discount: number
  total: number
  itemCount: number
  customerId: string | null
  customerName: string | null
  tableId: string | null
  tableLabel: string | null
}

type CheckoutState = {
  cart: CartLine[]
  orderType: OrderType
  searchQuery: string
  activeCategory: string | null
  cashTendered: string
  isSubmitting: boolean
  checkoutMode: CheckoutMode
  favoriteIds: string[]
  customAmount: string
  customNote: string
  discountNaira: number
  customerId: string | null
  customerName: string | null
  tableId: string | null
  tableLabel: string | null
  addItem: (post: MenuPost, vendorId: string, addons?: MenuAddon[]) => void
  addCustomAmount: (label: string, price: number) => void
  updateQty: (lineKey: string, quantity: number) => void
  removeLine: (lineKey: string) => void
  clearCart: () => void
  setOrderType: (orderType: OrderType) => void
  setSearchQuery: (query: string) => void
  setActiveCategory: (category: string | null) => void
  setCashTendered: (value: string) => void
  setIsSubmitting: (value: boolean) => void
  setCheckoutMode: (mode: CheckoutMode) => void
  setCustomAmount: (value: string) => void
  setCustomNote: (value: string) => void
  setDiscountNaira: (value: number) => void
  setCustomer: (id: string | null, name: string | null) => void
  setTable: (id: string | null, label: string | null) => void
  hydrateFavorites: (vendorId: string) => void
  toggleFavorite: (vendorId: string, postId: string) => void
  dineInReady: () => boolean
  beginSaleSubmit: () => SaleSubmitSnapshot | null
  finishSaleSubmit: () => void
  resetSale: () => void
  getSubtotal: () => number
  getDiscount: () => number
  getTotal: () => number
  getItemCount: () => number
  getLineItemsPayload: () => SaleSubmitSnapshot['lineItems']
}

export const useCheckoutStore = create<CheckoutState>((set, get) => ({
  cart: [],
  orderType: 'takeaway',
  searchQuery: '',
  activeCategory: null,
  cashTendered: '',
  isSubmitting: false,
  checkoutMode: 'menu',
  favoriteIds: [],
  customAmount: '',
  customNote: '',
  discountNaira: 0,
  customerId: null,
  customerName: null,
  tableId: null,
  tableLabel: null,

  addItem: (post, vendorId, addons = []) => {
    if (get().isSubmitting) return
    const price = post.price ?? 0
    if (price <= 0) return

    set((state) => {
      if (addons.length === 0) {
        const existing = state.cart.find(
          (line) => line.post_id === post.id && !line.is_custom && !line.selected_addons?.length,
        )
        if (existing) {
          const quantity = existing.quantity + 1
          return {
            cart: state.cart.map((line) =>
              line.line_key === existing.line_key
                ? { ...line, quantity, subtotal: lineSubtotal(line.price, quantity) }
                : line,
            ),
          }
        }

        return {
          cart: [
            ...state.cart,
            {
              line_key: post.id,
              post_id: post.id,
              vendor_id: vendorId,
              title: post.title,
              price,
              image_url: post.image_url,
              quantity: 1,
              sub_items: [],
              subtotal: lineSubtotal(price, 1),
              is_custom: false,
              fulfilment_mode: post.fulfilment_mode === 'ready' ? 'ready' : 'made_to_order',
            },
          ],
        }
      }

      const addonTotal = addons.reduce((sum, a) => sum + a.price, 0)
      const unitPrice = price + addonTotal
      const lineKey = `${post.id}+addons:${crypto.randomUUID()}`

      return {
        cart: [
          ...state.cart,
          {
            line_key: lineKey,
            post_id: post.id,
            vendor_id: vendorId,
            title: `${post.title} + ${addons.map((a) => a.title).join(', ')}`,
            price: unitPrice,
            image_url: post.image_url,
            quantity: 1,
            sub_items: [],
            subtotal: lineSubtotal(unitPrice, 1),
            is_custom: false,
            notes: addons.map((a) => a.title).join(', '),
            fulfilment_mode: post.fulfilment_mode === 'ready' ? 'ready' : 'made_to_order',
            selected_addons: addons.map((a) => ({
              id: a.id,
              title: a.title,
              price: a.price,
              quantity: 1,
            })),
          },
        ],
      }
    })
  },

  addCustomAmount: (label, price) => {
    if (get().isSubmitting) return
    if (!Number.isFinite(price) || price <= 0) return
    const id = `custom:${crypto.randomUUID()}`
    const title = label.trim() || 'Custom amount'
    set((state) => ({
      cart: [
        ...state.cart,
        {
          line_key: id,
          post_id: id,
          title,
          price,
          quantity: 1,
          sub_items: [],
          subtotal: lineSubtotal(price, 1),
          notes: title,
          is_custom: true,
          fulfilment_mode: 'ready',
        },
      ],
      customAmount: '',
      customNote: '',
    }))
  },

  updateQty: (lineKey, quantity) => {
    if (get().isSubmitting) return
    if (quantity <= 0) {
      get().removeLine(lineKey)
      return
    }
    set((state) => ({
      cart: state.cart.map((line) =>
        line.line_key === lineKey
          ? { ...line, quantity, subtotal: lineSubtotal(line.price, quantity) }
          : line,
      ),
    }))
  },

  removeLine: (lineKey) => {
    if (get().isSubmitting) return
    set((state) => ({
      cart: state.cart.filter((line) => line.line_key !== lineKey),
    }))
  },

  clearCart: () => {
    if (get().isSubmitting) return
    set({ cart: [], cashTendered: '', discountNaira: 0 })
  },

  setOrderType: (orderType) => {
    if (get().isSubmitting) return
    set((state) => ({
      orderType,
      tableId: orderType === 'dine_in' ? state.tableId : null,
      tableLabel: orderType === 'dine_in' ? state.tableLabel : null,
    }))
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setActiveCategory: (activeCategory) => set({ activeCategory }),
  setCashTendered: (cashTendered) => set({ cashTendered }),
  setIsSubmitting: (isSubmitting) => set({ isSubmitting }),
  setCheckoutMode: (checkoutMode) => set({ checkoutMode }),
  setCustomAmount: (customAmount) => set({ customAmount }),
  setCustomNote: (customNote) => set({ customNote }),

  setDiscountNaira: (value) => {
    if (get().isSubmitting) return
    const subtotal = get().getSubtotal()
    const next = Number.isFinite(value) ? Math.max(0, Math.min(value, subtotal)) : 0
    set({ discountNaira: next })
  },

  setCustomer: (id, name) => {
    if (get().isSubmitting) return
    set({ customerId: id, customerName: name })
  },

  setTable: (id, label) => {
    if (get().isSubmitting) return
    set({ tableId: id, tableLabel: label })
  },

  hydrateFavorites: (vendorId) => {
    set({ favoriteIds: loadFavoriteIds(vendorId) })
  },

  toggleFavorite: (vendorId, postId) => {
    set((state) => {
      const next = state.favoriteIds.includes(postId)
        ? state.favoriteIds.filter((id) => id !== postId)
        : [...state.favoriteIds, postId]
      saveFavoriteIds(vendorId, next)
      return { favoriteIds: next }
    })
  },

  dineInReady: () => {
    const state = get()
    return state.orderType !== 'dine_in' || Boolean(state.tableId)
  },

  beginSaleSubmit: () => {
    const state = get()
    // Atomic claim: reject if already submitting or cart empty / dine-in not ready.
    if (state.isSubmitting || state.cart.length === 0) return null
    if (!state.dineInReady()) return null
    const subtotal = state.getSubtotal()
    const discount = Math.min(state.discountNaira, subtotal)
    const snapshot: SaleSubmitSnapshot = {
      orderType: state.orderType,
      lineItems: state.getLineItemsPayload(),
      subtotal,
      discount,
      total: Math.max(0, subtotal - discount),
      itemCount: state.getItemCount(),
      customerId: state.customerId,
      customerName: state.customerName,
      tableId: state.tableId,
      tableLabel: state.tableLabel,
    }
    set({ isSubmitting: true })
    return snapshot
  },

  finishSaleSubmit: () => {
    set({ isSubmitting: false })
  },

  resetSale: () => {
    set({
      cart: [],
      cashTendered: '',
      searchQuery: '',
      activeCategory: null,
      orderType: 'takeaway',
      customAmount: '',
      customNote: '',
      discountNaira: 0,
      customerId: null,
      customerName: null,
      tableId: null,
      tableLabel: null,
      isSubmitting: false,
    })
  },

  getSubtotal: () => computeSubtotal(get().cart),

  getDiscount: () => {
    const state = get()
    return Math.min(state.discountNaira, computeSubtotal(state.cart))
  },

  getTotal: () => {
    const state = get()
    return Math.max(0, computeSubtotal(state.cart) - state.getDiscount())
  },

  getItemCount: () => get().cart.reduce((sum, line) => sum + line.quantity, 0),

  getLineItemsPayload: () =>
    get().cart.map((line) => ({
      post_id: line.post_id,
      quantity: line.quantity,
      unit_price: line.price,
      subtotal: line.subtotal,
      notes: line.notes,
      is_custom: line.is_custom === true,
      title: line.title,
      fulfilment_mode:
        line.is_custom || line.fulfilment_mode === 'ready' ? 'ready' : 'made_to_order',
      selected_addons: line.selected_addons,
    })),
}))
