import { getSupabaseClient } from '@/lib/supabase/client'
import type { Delivery, DeliveryStatus } from '@/lib/types/delivery'
import type { Order } from '@/lib/types/order'

function normalizeAddress(address?: string | null): string | null {
  if (!address) return null
  const normalized = address.replace(/\s+/g, ' ').trim()
  return normalized.length > 0 ? normalized : null
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100
}

function mapDelivery(row: Record<string, unknown>): Delivery {
  const riderRaw = row.rider
  const rider = Array.isArray(riderRaw) ? riderRaw[0] : riderRaw

  return {
    id: String(row.id),
    order_id: String(row.order_id),
    rider_id: (row.rider_id as string | null) ?? null,
    vendor_id: String(row.vendor_id),
    customer_id: String(row.customer_id),
    status: row.status as DeliveryStatus,
    delivery_type: (row.delivery_type as Delivery['delivery_type']) ?? 'rider',
    pickup_time: (row.pickup_time as string | null) ?? null,
    delivery_time: (row.delivery_time as string | null) ?? null,
    cancel_reason: (row.cancel_reason as string | null) ?? null,
    fee: row.fee == null ? null : Number(row.fee),
    distance_km: row.distance_km == null ? null : Number(row.distance_km),
    pickup_address: (row.pickup_address as string | null) ?? null,
    delivery_address: (row.delivery_address as string | null) ?? null,
    pickup_lat: row.pickup_lat == null ? null : Number(row.pickup_lat),
    pickup_lng: row.pickup_lng == null ? null : Number(row.pickup_lng),
    delivery_lat: row.delivery_lat == null ? null : Number(row.delivery_lat),
    delivery_lng: row.delivery_lng == null ? null : Number(row.delivery_lng),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    rider: rider
      ? {
          id: String((rider as Record<string, unknown>).id),
          name: String((rider as Record<string, unknown>).name ?? 'Rider'),
          phone: ((rider as Record<string, unknown>).phone as string | null) ?? null,
          avatar_url: ((rider as Record<string, unknown>).avatar_url as string | null) ?? null,
        }
      : null,
  }
}

type LocationRow = {
  latitude?: number | null
  longitude?: number | null
  location?: string | null
  address?: string | null
  business_name?: string | null
  name?: string | null
}

export class DeliveryService {
  static async getVendorDeliveries(
    vendorId: string,
    options?: { includeCompleted?: boolean; limit?: number },
  ): Promise<{ data: Delivery[]; error: string | null }> {
    try {
      const supabase = getSupabaseClient()
      const limit = options?.limit ?? 60
      const includeCompleted = options?.includeCompleted ?? true

      let query = supabase
        .from('deliveries')
        .select('*, rider:riders(id, name, phone, avatar_url)')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (!includeCompleted) {
        query = query.in('status', [
          'pending',
          'assigned',
          'en_route_vendor',
          'picked_up',
          'en_route_customer',
        ])
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching deliveries:', error)
        return { data: [], error: 'Failed to load deliveries' }
      }

      const deliveries = (data ?? []).map((row) => mapDelivery(row as Record<string, unknown>))
      return { data: await this.attachOrders(deliveries), error: null }
    } catch (error) {
      console.error('Error in getVendorDeliveries:', error)
      return { data: [], error: 'Something went wrong while loading deliveries' }
    }
  }

  private static async attachOrders(deliveries: Delivery[]): Promise<Delivery[]> {
    if (deliveries.length === 0) return []

    const supabase = getSupabaseClient()
    const orderIds = [...new Set(deliveries.map((d) => d.order_id))]

    const { data: orders } = await supabase
      .from('orders')
      .select(
        `
        id, status, total, delivery_method, delivery_address, delivery_time, created_at, notes,
        buyer:profiles!orders_buyer_id_fkey(id, username, name, phone, location)
      `,
      )
      .in('id', orderIds)

    const orderMap = new Map<string, Delivery['order']>()
    for (const order of orders ?? []) {
      const buyerRaw = (order as { buyer?: unknown }).buyer
      const buyer = Array.isArray(buyerRaw) ? buyerRaw[0] : buyerRaw
      orderMap.set(String(order.id), {
        id: String(order.id),
        status: order.status,
        total: Number(order.total) || 0,
        delivery_method: order.delivery_method,
        delivery_address: order.delivery_address,
        delivery_time: order.delivery_time,
        created_at: order.created_at,
        notes: order.notes,
        buyer: buyer as Order['buyer'],
      })
    }

    return deliveries.map((delivery) => ({
      ...delivery,
      order: orderMap.get(delivery.order_id) ?? null,
    }))
  }

  static async resolveDeliveryCoords(
    orderId: string,
    vendorId: string,
  ): Promise<{
    data: {
      fee: number
      distance_km: number
      pickup_address: string
      pickup_lat: number
      pickup_lng: number
      delivery_address: string
      delivery_lat: number
      delivery_lng: number
      customer_id: string
      canRequestRider: boolean
      reason?: string
    } | null
    error: string | null
  }> {
    try {
      const supabase = getSupabaseClient()

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(
          `
          id, vendor_id, buyer_id, delivery_address, delivery_fee,
          post:posts(id, user_id, location, latitude, longitude),
          buyer:profiles!orders_buyer_id_fkey(id, location, latitude, longitude)
        `,
        )
        .eq('id', orderId)
        .single()

      if (orderError || !order) {
        return { data: null, error: 'Order not found' }
      }

      const post = Array.isArray(order.post) ? order.post[0] : order.post
      const buyer = Array.isArray(order.buyer) ? order.buyer[0] : order.buyer
      const isOwner =
        (order.vendor_id && order.vendor_id === vendorId) ||
        (post && (post as LocationRow & { user_id?: string }).user_id === vendorId)

      if (!isOwner) {
        return { data: null, error: 'Unauthorized' }
      }

      let pickupLat = Number((post as LocationRow | null)?.latitude) || 0
      let pickupLng = Number((post as LocationRow | null)?.longitude) || 0
      let pickupAddress = (post as LocationRow | null)?.location || null

      if (!pickupLat || !pickupLng) {
        const { data: vendor } = await supabase
          .from('profiles')
          .select('latitude, longitude, location, business_name, name')
          .eq('id', vendorId)
          .maybeSingle()

        pickupLat = Number(vendor?.latitude) || 0
        pickupLng = Number(vendor?.longitude) || 0
        pickupAddress =
          pickupAddress ||
          vendor?.location ||
          vendor?.business_name ||
          vendor?.name ||
          null
      }

      let deliveryLat = Number((buyer as LocationRow | null)?.latitude) || 0
      let deliveryLng = Number((buyer as LocationRow | null)?.longitude) || 0
      let deliveryAddress =
        order.delivery_address || (buyer as LocationRow | null)?.location || null

      const canRequestRider = Boolean(
        pickupLat && pickupLng && deliveryLat && deliveryLng && deliveryAddress,
      )

      const distance_km =
        canRequestRider
          ? haversineKm(pickupLat, pickupLng, deliveryLat, deliveryLng)
          : 0

      return {
        data: {
          fee: Number(order.delivery_fee) || 0,
          distance_km,
          pickup_address: normalizeAddress(pickupAddress) || 'Restaurant',
          pickup_lat: pickupLat,
          pickup_lng: pickupLng,
          delivery_address: normalizeAddress(deliveryAddress) || 'Customer address',
          delivery_lat: deliveryLat,
          delivery_lng: deliveryLng,
          customer_id: String(order.buyer_id),
          canRequestRider,
          reason: canRequestRider
            ? undefined
            : 'Missing pickup or customer coordinates. Use self-delivery, or update locations.',
        },
        error: null,
      }
    } catch (error) {
      console.error('Error in resolveDeliveryCoords:', error)
      return { data: null, error: 'Failed to resolve delivery locations' }
    }
  }

  static async requestRider(
    orderId: string,
    vendorId: string,
  ): Promise<{ success: boolean; error: string | null; deliveryId?: string }> {
    try {
      const supabase = getSupabaseClient()
      const coords = await this.resolveDeliveryCoords(orderId, vendorId)
      if (coords.error || !coords.data) {
        return { success: false, error: coords.error || 'Could not prepare delivery' }
      }
      if (!coords.data.canRequestRider) {
        return { success: false, error: coords.data.reason || 'Cannot request rider' }
      }

      const { data: existing } = await supabase
        .from('deliveries')
        .select('id, status')
        .eq('order_id', String(orderId))
        .maybeSingle()

      if (existing && existing.status !== 'cancelled') {
        return { success: false, error: 'Delivery request already exists for this order' }
      }

      if (existing?.status === 'cancelled') {
        await supabase.from('deliveries').delete().eq('id', existing.id)
      }

      const info = coords.data
      const { data, error } = await supabase
        .from('deliveries')
        .insert({
          order_id: String(orderId),
          vendor_id: vendorId,
          customer_id: info.customer_id,
          status: 'pending',
          delivery_type: 'rider',
          fee: info.fee,
          distance_km: info.distance_km,
          pickup_address: info.pickup_address,
          pickup_lat: info.pickup_lat,
          pickup_lng: info.pickup_lng,
          delivery_address: info.delivery_address,
          delivery_lat: info.delivery_lat,
          delivery_lng: info.delivery_lng,
        })
        .select('id')
        .single()

      if (error) {
        console.error('Error creating rider delivery:', error)
        return { success: false, error: 'Failed to request rider' }
      }

      await supabase
        .from('orders')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .in('status', ['pending', 'pending_payment'])

      return { success: true, error: null, deliveryId: data.id }
    } catch (error) {
      console.error('Error in requestRider:', error)
      return { success: false, error: 'Something went wrong while requesting a rider' }
    }
  }

  static async assignSelfDelivery(
    orderId: string,
    vendorId: string,
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabase = getSupabaseClient()
      const coords = await this.resolveDeliveryCoords(orderId, vendorId)
      if (coords.error || !coords.data) {
        return { success: false, error: coords.error || 'Could not prepare delivery' }
      }

      const info = coords.data
      const { data: existing } = await supabase
        .from('deliveries')
        .select('id')
        .eq('order_id', String(orderId))
        .maybeSingle()

      const payload = {
        order_id: String(orderId),
        vendor_id: vendorId,
        customer_id: info.customer_id,
        status: 'assigned' as const,
        delivery_type: 'vendor' as const,
        fee: info.fee,
        distance_km: info.distance_km,
        pickup_address: info.pickup_address,
        pickup_lat: info.pickup_lat || null,
        pickup_lng: info.pickup_lng || null,
        delivery_address: info.delivery_address,
        delivery_lat: info.delivery_lat || null,
        delivery_lng: info.delivery_lng || null,
      }

      if (!existing) {
        const { error } = await supabase.from('deliveries').insert(payload)
        if (error) {
          console.error('Error creating vendor delivery:', error)
          return { success: false, error: 'Failed to start self-delivery' }
        }
      } else {
        const { error } = await supabase.from('deliveries').update(payload).eq('id', existing.id)
        if (error) {
          console.error('Error updating vendor delivery:', error)
          return { success: false, error: 'Failed to switch to self-delivery' }
        }
      }

      await supabase
        .from('orders')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .in('status', ['pending', 'pending_payment'])

      return { success: true, error: null }
    } catch (error) {
      console.error('Error in assignSelfDelivery:', error)
      return { success: false, error: 'Something went wrong while assigning delivery' }
    }
  }

  static async cancelPendingRiderRequest(
    orderId: string,
    vendorId: string,
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabase = getSupabaseClient()
      const { data: delivery, error } = await supabase
        .from('deliveries')
        .select('id, status, vendor_id')
        .eq('order_id', String(orderId))
        .maybeSingle()

      if (error || !delivery) {
        return { success: false, error: 'Delivery request not found' }
      }
      if (delivery.vendor_id !== vendorId) {
        return { success: false, error: 'Unauthorized' }
      }
      if (delivery.status !== 'pending') {
        return { success: false, error: 'Cannot cancel — rider already accepted' }
      }

      const { error: deleteError } = await supabase
        .from('deliveries')
        .delete()
        .eq('id', delivery.id)

      if (deleteError) {
        return { success: false, error: 'Failed to cancel rider request' }
      }

      return { success: true, error: null }
    } catch (error) {
      console.error('Error in cancelPendingRiderRequest:', error)
      return { success: false, error: 'Something went wrong while cancelling' }
    }
  }

  static async retryRiderRequest(
    orderId: string,
    vendorId: string,
  ): Promise<{ success: boolean; error: string | null }> {
    const cancel = await this.cancelPendingRiderRequest(orderId, vendorId)
    if (!cancel.success) return cancel
    return this.requestRider(orderId, vendorId)
  }

  static async updateDeliveryStatus(
    deliveryId: string,
    vendorId: string,
    nextStatus: DeliveryStatus,
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabase = getSupabaseClient()
      const { data: delivery, error } = await supabase
        .from('deliveries')
        .select('id, vendor_id, order_id, delivery_type, status')
        .eq('id', deliveryId)
        .single()

      if (error || !delivery) {
        return { success: false, error: 'Delivery not found' }
      }
      if (delivery.vendor_id !== vendorId) {
        return { success: false, error: 'Unauthorized' }
      }

      const update: Record<string, string> = {
        status: nextStatus,
        updated_at: new Date().toISOString(),
      }

      if (nextStatus === 'picked_up') {
        update.pickup_time = new Date().toISOString()
      }
      if (nextStatus === 'delivered') {
        update.delivery_time = new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from('deliveries')
        .update(update)
        .eq('id', deliveryId)

      if (updateError) {
        console.error('Error updating delivery status:', updateError)
        return { success: false, error: 'Failed to update delivery status' }
      }

      // Order sync trigger usually handles delivered; keep desktop resilient
      if (nextStatus === 'delivered') {
        await supabase
          .from('orders')
          .update({
            status: 'delivered',
            delivered_at: new Date().toISOString(),
          })
          .eq('id', delivery.order_id)
      }

      return { success: true, error: null }
    } catch (error) {
      console.error('Error in updateDeliveryStatus:', error)
      return { success: false, error: 'Something went wrong while updating status' }
    }
  }
}
