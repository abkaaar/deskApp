import { getSupabaseClient } from '@/lib/supabase/client'
import { assertDesktopEntitled } from '@/lib/auth/assertDesktopEntitled'

import { classifyCheckoutError } from './classifyCheckoutError'
import { encodePosNotes } from './pos-order'
import {
  orderTypeToDeliveryMethod,
  orderTypeToKitchenStatus,
  orderTypeToStatus,
  resolveFulfilment,
} from './posOrderStatus'
import type { CreatePosOrderPayload, MenuPost, PosOrderResult } from './types'

export { classifyCheckoutError } from './classifyCheckoutError'
export {
  orderTypeToDeliveryMethod,
  orderTypeToKitchenStatus,
  orderTypeToStatus,
  orderStatusToKitchenStatus,
  effectiveKitchenLane,
  resolveFulfilment,
} from './posOrderStatus'

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
    return { success: false, error: 'Cart is empty', retryable: false }
  }

  const entitled = await assertDesktopEntitled(payload.vendorId)
  if (!entitled.ok) {
    return { success: false, error: entitled.error, retryable: false }
  }

  // Holds are local drafts (SQLite). Never create a cloud order for hold:true.
  // Stock / recipe deductions run only on paid create below — not on Hold or Kitchen Accept.
  if (payload.hold === true) {
    return {
      success: false,
      error: 'Hold saves the cart locally — use Hold from checkout, not order create.',
      retryable: false,
    }
  }

  const supabase = getSupabaseClient()
  const decrementedPosts: { postId: string; quantity: number }[] = []
  const isHold = false

  try {
    const posExternalId = payload.posExternalId?.trim() || crypto.randomUUID()

    // Idempotent retries (Foodpos parity): resolve before any stock mutation.
    const { data: existingByExternalId } = await supabase
      .from('orders')
      .select('id')
      .eq('pos_external_id', posExternalId)
      .maybeSingle()
    if (existingByExternalId?.id) {
      return { success: true, orderId: String(existingByExternalId.id) }
    }

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
    // Avoid selecting fulfilment_mode here — cart/outbox lines already carry it, and a
    // missing remote column would null out `.data` and block every flush with a vague error.
    let posts: {
      id: string
      stock_quantity: number | null
      is_available: boolean | null
      title: string
    }[] = []

    if (postIds.length > 0) {
      const { data, error: postsError } = await supabase
        .from('posts')
        .select('id, stock_quantity, is_available, title')
        .in('id', postIds)
        .is('deleted_at', null)

      if (postsError) {
        const classified = classifyCheckoutError(
          postsError.message || postsError.details || postsError.hint,
          isHold,
        )
        return {
          success: false,
          error: classified.error || 'Could not verify item availability. Please try again.',
          retryable: classified.retryable,
        }
      }
      posts = (data ?? []) as typeof posts
    }

    for (const [postId, neededQty] of stockNeeded) {
      const post = posts.find((p) => p.id === postId)
      if (!post) {
        return {
          success: false,
          error: 'An item in the cart is no longer available.',
          retryable: false,
        }
      }
      if (post.is_available === false) {
        return { success: false, error: `${post.title} is unavailable.`, retryable: false }
      }
      if (!isHold && post.stock_quantity !== null && post.stock_quantity < neededQty) {
        return {
          success: false,
          error: `${post.title}: only ${post.stock_quantity} left in stock.`,
          retryable: false,
        }
      }
    }

    const enrichedLines = payload.lineItems.map((line) => {
      if (line.is_custom || line.post_id.startsWith('custom:')) {
        return { ...line, fulfilment_mode: 'ready' as const }
      }
      // Prefer mode snapshotted at sale time (offline queue / cart).
      if (line.fulfilment_mode === 'ready' || line.fulfilment_mode === 'made_to_order') {
        return line
      }
      return { ...line, fulfilment_mode: 'made_to_order' as const }
    })

    const fulfilment = resolveFulfilment(enrichedLines)

    const ledgerOwnedPosts = new Set<string>()
    if (!isHold && postIds.length > 0) {
      const [{ data: linkedItems }, { data: recipePosts }] = await Promise.all([
        supabase
          .from('inventory_items')
          .select('post_id')
          .eq('vendor_id', payload.vendorId)
          .in('post_id', postIds)
          .eq('item_type', 'finished_product')
          .is('deleted_at', null),
        supabase
          .from('inventory_recipes')
          .select('post_id')
          .eq('vendor_id', payload.vendorId)
          .in('post_id', postIds)
          .eq('is_active', true),
      ])
      for (const row of linkedItems ?? []) {
        if (row.post_id) ledgerOwnedPosts.add(String(row.post_id))
      }
      for (const row of recipePosts ?? []) {
        if (row.post_id) ledgerOwnedPosts.add(String(row.post_id))
      }
    }

    if (!isHold) {
      for (const [postId, neededQty] of stockNeeded) {
        if (ledgerOwnedPosts.has(postId)) continue
        const post = posts.find((p) => p.id === postId)
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
              retryable: false,
            }
          }
          decrementedPosts.push({ postId, quantity: neededQty })
        }
      }
    }

    const now = new Date().toISOString()
    const status = orderTypeToStatus(payload.orderType, isHold, fulfilment.needsKitchen)
    const kitchenStatus = orderTypeToKitchenStatus(
      payload.orderType,
      isHold,
      fulfilment.needsKitchen,
    )
    const firstPostId = catalogLines[0]?.post_id ?? null
    const customNotes = customLines
      .map((line) => `${line.notes || 'Custom amount'}: ₦${line.subtotal}`)
      .join('; ')
    const payable = Math.max(0, payload.subtotal - discount)

    const insertRow: Record<string, unknown> = {
      buyer_id: null,
      vendor_id: payload.vendorId,
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
      pos_external_id: posExternalId,
      kitchen_status: kitchenStatus,
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
        paymentReference: payload.paymentReference || undefined,
      }),
      pos_meta: {
        order_type: payload.orderType,
        payment_method: payload.paymentMethod,
        table_id: payload.tableId,
        held: isHold,
        custom_amounts: customNotes || undefined,
        pos_external_id: posExternalId,
        payment_reference: payload.paymentReference || undefined,
        cash_tendered: payload.cashTendered ?? undefined,
        change_due: payload.changeDue ?? undefined,
        lines: fulfilment.lineModes,
        needs_kitchen: fulfilment.needsKitchen,
      },
    }
    if (firstPostId) insertRow.post_id = firstPostId
    if (payload.paymentReference) {
      insertRow.payment_reference = payload.paymentReference
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(insertRow)
      .select('id')
      .single()

    if (orderError || !order) {
      const errText = [
        orderError?.message,
        orderError?.details,
        orderError?.hint,
        orderError?.code,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const isExternalIdConflict =
        errText.includes('pos_external_id') &&
        (errText.includes('duplicate') ||
          errText.includes('unique') ||
          errText.includes('already exists') ||
          errText.includes('23505') ||
          orderError?.code === '23505')

      if (isExternalIdConflict) {
        const { data: raced } = await supabase
          .from('orders')
          .select('id')
          .eq('pos_external_id', posExternalId)
          .maybeSingle()
        if (raced?.id) {
          // Winning insert already applied stock — undo this attempt's decrements.
          for (const prev of decrementedPosts) {
            await supabase.rpc('restore_stock', {
              p_post_id: prev.postId,
              p_quantity: prev.quantity,
            })
          }
          return { success: true, orderId: String(raced.id) }
        }
      }

      console.error('Error creating POS order:', orderError)
      for (const prev of decrementedPosts) {
        await supabase.rpc('restore_stock', {
          p_post_id: prev.postId,
          p_quantity: prev.quantity,
        })
      }
      const classified = classifyCheckoutError(
        orderError?.message || orderError?.details || orderError?.hint,
        isHold,
      )
      return { success: false, error: classified.error, retryable: classified.retryable }
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
        // Roll back the order — line items are required for web/kitchen accuracy.
        await supabase.from('orders').delete().eq('id', order.id)
        for (const prev of decrementedPosts) {
          await supabase.rpc('restore_stock', {
            p_post_id: prev.postId,
            p_quantity: prev.quantity,
          })
        }
        return {
          success: false,
          error: 'Could not save order items. Please try again.',
          retryable: true,
        }
      }
    }

    if (!isHold && catalogLines.length > 0) {
      const saleLines = catalogLines.map((line) => ({
        post_id: line.post_id,
        quantity: line.quantity,
        notes: line.notes ?? null,
      }))
      const { error: ledgerError } = await supabase.rpc('deduct_inventory_for_pos_sale', {
        p_vendor_id: payload.vendorId,
        p_lines: saleLines,
        p_order_id: typeof order.id === 'number' ? order.id : Number(order.id),
      })
      if (ledgerError) {
        console.warn('Inventory ledger deduct failed:', ledgerError.message)
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
    const message = error instanceof Error ? error.message : String(error)
    const classified = classifyCheckoutError(message, isHold)
    return { success: false, error: classified.error, retryable: classified.retryable }
  }
}
