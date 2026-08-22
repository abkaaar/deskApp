import type { MenuPost } from '@/lib/types/menu'

export type { MenuPost }

export type OrderType = 'dine_in' | 'takeaway' | 'delivery'

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'wallet' | 'mixed'

export interface MenuAddon {
  id: string
  title: string
  price: number
}

export interface SelectedAddon {
  id: string
  title: string
  price: number
  quantity: number
}

export interface CartLine {
  /** Unique row id in the cart (may differ from catalog post_id when add-ons are attached). */
  line_key: string
  post_id: string
  vendor_id?: string
  title: string
  price: number
  image_url?: string | null
  quantity: number
  sub_items: string[]
  subtotal: number
  notes?: string
  /** Keypad custom amount — not a catalog post. */
  is_custom?: boolean
  selected_addons?: SelectedAddon[]
}

export interface OrderLineItemPayload {
  post_id: string
  quantity: number
  unit_price: number
  subtotal: number
  notes?: string
  is_custom?: boolean
  selected_addons?: SelectedAddon[]
}

export interface CreatePosOrderPayload {
  vendorId: string
  buyerId: string
  orderType: OrderType
  paymentMethod: PaymentMethod
  lineItems: OrderLineItemPayload[]
  subtotal: number
  total: number
  totalQuantity: number
  customerName?: string | null
  customerId?: string | null
  tableId?: string | null
  discount?: number
  /** Unpaid hold — skip stock decrement and mark pending. */
  hold?: boolean
  /** Optional till session (deferred from MVP). */
  registerSessionId?: string | null
}

export interface PosOrderResult {
  success: boolean
  orderId?: string
  error?: string
}
