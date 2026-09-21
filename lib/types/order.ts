export type OrderStatus =
  | 'pending_payment'
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled'

export type KitchenStatus =
  | 'pending'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled'

export type DeliveryMethod = 'pickup' | 'delivery'

export type DeliveryStatus =
  | 'pending'
  | 'assigned'
  | 'en_route_vendor'
  | 'picked_up'
  | 'en_route_customer'
  | 'delivered'
  | 'cancelled'

export type DeliveryType = 'rider' | 'vendor'

export interface OrderLineItem {
  id: string
  order_id: string
  post_id: string
  quantity: number
  unit_price: number
  subtotal: number
  notes?: string
  selected_addons?: {
    id: string
    title: string
    price: number
    quantity: number
  }[]
  created_at?: string
  post?: {
    id: string
    title: string
    image_url?: string
    price: number
    description?: string
    user_id?: string
  }
}

export interface Order {
  id: string
  order_number?: string
  created_at: string
  post_id?: string
  buyer_id: string
  vendor_id?: string
  quantity: number
  total_items?: number
  subtotal: number
  service_fee: number
  delivery_fee: number
  total: number
  promo_discount?: number
  delivery_method: DeliveryMethod
  delivery_address?: string
  delivery_time?: string
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded'
  payment_reference?: string | null
  status: OrderStatus
  /** POS kitchen ladder; prefer this for KDS when source === 'pos'. */
  kitchen_status?: KitchenStatus | null
  source?: 'marketplace' | 'pos' | string | null
  pos_external_id?: string | null
  pos_meta?: Record<string, unknown> | null
  register_session_id?: string | null
  confirmed_at?: string
  delivered_at?: string
  paid_at?: string
  notes?: string
  line_items?: OrderLineItem[]
  post?: {
    id: string
    title: string
    image_url?: string
    price: number
    description?: string
    user_id?: string
  }
  buyer?: {
    id: string
    username: string
    name?: string
    phone?: string
    location?: string
  }
  delivery?: {
    id: string
    status: DeliveryStatus
    delivery_type?: DeliveryType
    rider_id?: string
  }
}
