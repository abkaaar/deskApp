import type { DeliveryStatus, DeliveryType, Order } from '@/lib/types/order'

export type { DeliveryStatus, DeliveryType }

export interface DeliveryRider {
  id: string
  name: string
  phone: string | null
  avatar_url: string | null
}

export interface DeliveryOrderSummary {
  id: string
  status: Order['status']
  total: number
  delivery_method: Order['delivery_method']
  delivery_address?: string | null
  delivery_time?: string | null
  created_at: string
  notes?: string | null
  buyer?: Order['buyer']
}

export interface Delivery {
  id: string
  order_id: string
  rider_id: string | null
  vendor_id: string
  customer_id: string
  status: DeliveryStatus
  delivery_type: DeliveryType
  pickup_time: string | null
  delivery_time: string | null
  cancel_reason: string | null
  fee: number | null
  distance_km: number | null
  pickup_address: string | null
  delivery_address: string | null
  pickup_lat: number | null
  pickup_lng: number | null
  delivery_lat: number | null
  delivery_lng: number | null
  created_at: string
  updated_at: string
  rider: DeliveryRider | null
  order?: DeliveryOrderSummary | null
}

/** Ordered stages a delivery moves through, excluding `cancelled`. */
export const DELIVERY_PIPELINE: { key: DeliveryStatus; label: string }[] = [
  { key: 'pending', label: 'Requested' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'en_route_vendor', label: 'To pickup' },
  { key: 'picked_up', label: 'Picked up' },
  { key: 'en_route_customer', label: 'On the way' },
  { key: 'delivered', label: 'Delivered' },
]

export const ACTIVE_DELIVERY_STATUSES: DeliveryStatus[] = [
  'pending',
  'assigned',
  'en_route_vendor',
  'picked_up',
  'en_route_customer',
]
