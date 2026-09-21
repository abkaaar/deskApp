import type { MenuPost } from '@/lib/types/menu'

export type { MenuPost }

export type OrderType = 'dine_in' | 'takeaway' | 'delivery'

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'wallet' | 'mixed'

/** Menu item POS fulfilment — mirrors posts.fulfilment_mode */
export type FulfilmentMode = 'ready' | 'made_to_order'

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
  /** Ready-to-serve vs kitchen; custom lines are always ready. */
  fulfilment_mode?: FulfilmentMode
}

export interface OrderLineItemPayload {
  post_id: string
  quantity: number
  unit_price: number
  subtotal: number
  notes?: string
  is_custom?: boolean
  selected_addons?: SelectedAddon[]
  fulfilment_mode?: FulfilmentMode
  title?: string
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
  /** Idempotency key (outbox id or fresh UUID). Maps to orders.pos_external_id. */
  posExternalId?: string | null
  /** Transfer/wallet reference or card confirmation note. */
  paymentReference?: string | null
  /** Cash tendered (naira) when method is cash. */
  cashTendered?: number | null
  /** Change due (naira) when method is cash. */
  changeDue?: number | null
}

export interface PosOrderResult {
  success: boolean
  orderId?: string
  error?: string
  /** When true, client may queue offline and retry. When false, keep cart and show error. */
  retryable?: boolean
}
