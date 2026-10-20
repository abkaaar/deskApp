import { getSupabaseClient } from '@/lib/supabase/client'
import { orderStatusToKitchenStatus } from '@/lib/checkout/posOrderStatus'
import type { Order, OrderStatus } from '@/lib/types/order'

const ORDER_SELECT = `
  id, order_number, created_at, post_id, buyer_id, vendor_id, quantity, total_items,
  subtotal, service_fee, delivery_fee, total, promo_discount, delivery_method,
  delivery_address, delivery_time, payment_status, payment_reference, status,
  kitchen_status, source, pos_external_id, pos_meta, register_session_id,
  confirmed_at, delivered_at, paid_at, notes,
  line_items:order_line_items(
    id, order_id, post_id, quantity, unit_price, subtotal, notes, selected_addons, created_at,
    post:posts(id, title, image_url, price, description, user_id)
  ),
  post:posts(id, title, image_url, price, description, user_id),
  buyer:profiles!orders_buyer_id_fkey(id, username, name, phone, location)
`

type OrderStatusExtras = {
  confirmed_at?: string
  delivered_at?: string | null
  delivery_time?: string
}

function unwrapRelation<T>(value: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(value)) return value[0]
  return value ?? undefined
}

export class OrderService {
  static async getVendorOrders(
    vendorId: string,
    limit = 20,
    offset = 0,
  ): Promise<{ data: Order[]; error: string | null; hasMore: boolean }> {
    try {
      const supabase = getSupabaseClient()

      const { data, error } = await supabase
        .from('orders')
        .select(ORDER_SELECT)
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('Error fetching vendor orders:', error)
        return { data: [], error: 'Failed to load orders', hasMore: false }
      }

      const rows = data ?? []
      const orderIds = rows.map((row) => String(row.id))
      const deliveriesMap = await this.fetchDeliverySummaries(orderIds)

      const orders = rows.map((row) => {
        const order = row as unknown as Order
        return {
          ...order,
          post: unwrapRelation(order.post),
          buyer: unwrapRelation(order.buyer),
          delivery: deliveriesMap[String(order.id)] ?? undefined,
        }
      })

      return { data: orders, error: null, hasMore: rows.length === limit }
    } catch (error) {
      console.error('Error in getVendorOrders:', error)
      return { data: [], error: 'Something went wrong while loading orders', hasMore: false }
    }
  }

  private static async fetchDeliverySummaries(
    orderIds: string[],
  ): Promise<Record<string, Order['delivery']>> {
    if (orderIds.length === 0) return {}

    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('deliveries')
      .select('id, order_id, status, delivery_type, rider_id')
      .in('order_id', orderIds)

    if (error) {
      console.error('Error fetching delivery summaries:', error)
      return {}
    }

    const map: Record<string, Order['delivery']> = {}
    for (const row of data ?? []) {
      map[String(row.order_id)] = {
        id: String(row.id),
        status: row.status,
        delivery_type: row.delivery_type ?? undefined,
        rider_id: row.rider_id ?? undefined,
      }
    }
    return map
  }

  /**
   * Kitchen / fulfillment status only.
   * Must never deduct stock, charge payment, or insert line items —
   * so KDS Recall (delivered → ready) cannot double-consume inventory.
   */
  static async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    vendorId: string,
    additionalData?: OrderStatusExtras,
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabase = getSupabaseClient()

      const updateData: Record<string, string | null> = { status: newStatus }

      const kitchen = orderStatusToKitchenStatus(newStatus)
      if (kitchen) {
        updateData.kitchen_status = kitchen
      }

      if (additionalData?.confirmed_at) {
        updateData.confirmed_at = additionalData.confirmed_at
      }

      // `delivered_at` must be clearable when an order is pulled back from delivered.
      if (additionalData && 'delivered_at' in additionalData) {
        updateData.delivered_at = additionalData.delivered_at ?? null
      }

      if (additionalData?.delivery_time) {
        updateData.delivery_time = additionalData.delivery_time
      }

      // Cancel before cooking: restore menu stock once for paid POS sales that
      // never reached ready/delivered (food not finished).
      if (newStatus === 'cancelled') {
        const { data: existing } = await supabase
          .from('orders')
          .select('payment_status, kitchen_status, status, source')
          .eq('id', orderId)
          .eq('vendor_id', vendorId)
          .maybeSingle()

        const kitchen = String(existing?.kitchen_status || '').toLowerCase()
        const payment = String(existing?.payment_status || '').toLowerCase()
        const finished =
          kitchen === 'ready' ||
          kitchen === 'completed' ||
          kitchen === 'delivered' ||
          existing?.status === 'delivered' ||
          existing?.status === 'ready'

        if (payment === 'paid' && !finished) {
          const { data: lines } = await supabase
            .from('order_line_items')
            .select('post_id, quantity')
            .eq('order_id', orderId)
          for (const line of lines ?? []) {
            if (!line.post_id) continue
            await supabase.rpc('restore_stock', {
              p_post_id: line.post_id,
              p_quantity: line.quantity,
            })
          }
        }
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .eq('vendor_id', vendorId)

      if (error) {
        console.error('Error updating order status:', error)
        return { success: false, error: 'Failed to update order' }
      }

      return { success: true, error: null }
    } catch (error) {
      console.error('Error in updateOrderStatus:', error)
      return { success: false, error: 'Something went wrong while updating the order' }
    }
  }

  static async updateDeliveryTime(
    orderId: string,
    deliveryTime: string,
    vendorId: string,
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabase = getSupabaseClient()

      const { error } = await supabase
        .from('orders')
        .update({ delivery_time: deliveryTime })
        .eq('id', orderId)
        .eq('vendor_id', vendorId)

      if (error) {
        console.error('Error updating delivery time:', error)
        return { success: false, error: 'Failed to set delivery time' }
      }

      return { success: true, error: null }
    } catch (error) {
      console.error('Error in updateDeliveryTime:', error)
      return { success: false, error: 'Something went wrong while setting delivery time' }
    }
  }
}
