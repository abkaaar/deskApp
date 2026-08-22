import { getSupabaseClient } from '@/lib/supabase/client'
import type { OrderStatus } from '@/lib/types/order'

import { encodePosNotes } from './pos-order'
import type { CreatePosOrderPayload, MenuPost, OrderType, PosOrderResult } from './types'

function orderTypeToStatus(orderType: OrderType): OrderStatus {
  // Dine-in and takeaway are settled at the counter; delivery still needs fulfilment.
  return orderType === 'delivery' ? 'confirmed' : 'delivered'
}

function orderTypeToDeliveryMethod(orderType: OrderType): 'pickup' | 'delivery' {
  return orderType === 'delivery' ? 'delivery' : 'pickup'
}

export async function fetchVendorMenu(vendorId: string): Promise<MenuPost[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', vendorId)
    .is('deleted_at', null)
    .order('title', { ascending: true })

  if (error) {
    console.error('Error fetching vendor menu:', error)
    throw new Error('Failed to load menu')
  }

  return (data ?? []) as MenuPost[]
}

export async function createPosOrderFromCart(
  payload: CreatePosOrderPayload,
): Promise<PosOrderResult> {
  if (payload.lineItems.length === 0) {
    return { success: false, error: 'Cart is empty' }
  }

  const supabase = getSupabaseClient()
  const decrementedPosts: { postId: string; quantity: number }[] = []

  try {
    const isHold = payload.hold === true
    const discount = Math.max(0, Math.min(payload.discount ?? 0, payload.subtotal))
    const catalogLines = payload.lineItems.filter(
      (line) => !line.is_custom && !line.post_id.startsWith('custom:'),
    )
    const customLines = payload.lineItems.filter(
      (line) => line.is_custom || line.post_id.startsWith('custom:'),
    )

    const stockNeeded = new Map<string, number>()
    for (const line of catalogLines) {
      stockNeeded.set(line.post_id, (stockNeeded.get(line.post_id) ?? 0) + line.quantity)
    }

    const postIds = [...stockNeeded.keys()]
    const posts =
      postIds.length === 0
        ? []
        : (
            await supabase
              .from('posts')
              .select('id, stock_quantity, is_available, title')
              .in('id', postIds)
              .is('deleted_at', null)
          ).data

    if (postIds.length > 0 && !posts) {
      return { success: false, error: 'Could not verify item availability. Please try again.' }
    }

    for (const [postId, neededQty] of stockNeeded) {
      const post = (posts ?? []).find((p) => p.id === postId)
      if (!post) {
        return { success: false, error: 'An item in the cart is no longer available.' }
      }
      if (post.is_available === false) {
        return { success: false, error: `${post.title} is unavailable.` }
      }
      if (!isHold && post.stock_quantity !== null && post.stock_quantity < neededQty) {
        return { success: false, error: `${post.title}: only ${post.stock_quantity} left in stock.` }
      }
    }

    // A hold does not consume stock — it is settled when the order is later paid.
    if (!isHold) {
      for (const [postId, neededQty] of stockNeeded) {
        const post = (posts ?? []).find((p) => p.id === postId)
        if (post && post.stock_quantity !== null) {
          const { data: success } = await supabase.rpc('decrement_stock', {
            p_post_id: postId,
            p_quantity: neededQty,
          })
          if (!success) {
            for (const prev of decrementedPosts) {
              await supabase.rpc('restore_stock', {
                p_post_id: prev.postId,
                p_quantity: prev.quantity,
              })
            }
            return {
              success: false,
              error: `${post.title}: Stock changed during checkout. Please try again.`,
            }
          }
          decrementedPosts.push({ postId, quantity: neededQty })
        }
      }
    }

    const now = new Date().toISOString()
    const status = isHold ? 'pending' : orderTypeToStatus(payload.orderType)
    const firstPostId = catalogLines[0]?.post_id ?? null
    const customNotes = customLines
      .map((line) => `${line.notes || 'Custom amount'}: ₦${line.subtotal}`)
      .join('; ')
    const payable = Math.max(0, payload.subtotal - discount)

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        buyer_id: null,
        vendor_id: payload.vendorId,
        post_id: firstPostId,
        quantity: payload.totalQuantity,
        total_items: payload.totalQuantity,
        subtotal: payload.subtotal,
        service_fee: 0,
        delivery_fee: 0,
        total: payable,
        promo_discount: discount,
        delivery_method: orderTypeToDeliveryMethod(payload.orderType),
        payment_status: isHold ? 'pending' : 'paid',
        status,
        source: 'pos',
        register_session_id: payload.registerSessionId || null,
        created_at: now,
        paid_at: isHold ? null : now,
        confirmed_at: isHold ? null : now,
        delivered_at: !isHold && status === 'delivered' ? now : null,
        notes: encodePosNotes({
          orderType: payload.orderType,
          paymentMethod: payload.paymentMethod,
          customerName: payload.customerName,
          customerId: payload.customerId,
          tableId: payload.tableId,
          customAmounts: customNotes || undefined,
          held: isHold,
        }),
        pos_meta: {
          order_type: payload.orderType,
          payment_method: payload.paymentMethod,
          table_id: payload.tableId,
          held: isHold,
        },
      })
      .select('id')
      .single()

    if (orderError || !order) {
      console.error('Error creating POS order:', orderError)
      for (const prev of decrementedPosts) {
        await supabase.rpc('restore_stock', {
          p_post_id: prev.postId,
          p_quantity: prev.quantity,
        })
      }
      return { success: false, error: isHold ? 'Failed to hold order' : 'Failed to record sale' }
    }

    const lineItemsToInsert = catalogLines.map((li) => ({
      order_id: order.id,
      post_id: li.post_id,
      quantity: li.quantity,
      unit_price: li.unit_price,
      subtotal: li.subtotal,
      notes: li.notes ?? null,
      selected_addons: li.selected_addons ?? null,
      created_at: now,
    }))

    if (lineItemsToInsert.length > 0) {
      const { error: lineItemsError } = await supabase
        .from('order_line_items')
        .insert(lineItemsToInsert)
      if (lineItemsError) {
        console.error('Error inserting POS line items:', lineItemsError)
      }
    }

    return { success: true, orderId: String(order.id) }
  } catch (error) {
    console.error('Error in createPosOrderFromCart:', error)
    for (const prev of decrementedPosts) {
      await supabase.rpc('restore_stock', {
        p_post_id: prev.postId,
        p_quantity: prev.quantity,
      })
    }
    return { success: false, error: 'Something went wrong while recording the sale' }
  }
}
