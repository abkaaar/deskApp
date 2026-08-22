import { getSupabaseClient } from '@/lib/supabase/client'

import {
  EMPTY_REGISTER_TOTALS,
  expectedCashFromSession,
  roundMoney,
  type CloseRegisterInput,
  type OpenRegisterInput,
  type RegisterEventType,
  type RegisterPaymentMethod,
  type RegisterSession,
  type RegisterSessionTotals,
} from './types'

function mapSession(row: Record<string, unknown>): RegisterSession {
  const totals = (row.totals_json as RegisterSessionTotals | null) ?? EMPTY_REGISTER_TOTALS
  return {
    id: String(row.id),
    vendor_id: String(row.vendor_id),
    terminal_id: String(row.terminal_id),
    terminal_name: String(row.terminal_name),
    cashier_user_id: (row.cashier_user_id as string | null) ?? null,
    cashier_name: String(row.cashier_name ?? ''),
    status: row.status === 'closed' ? 'closed' : 'open',
    opening_float: Number(row.opening_float ?? 0),
    closing_counted_cash:
      row.closing_counted_cash == null ? null : Number(row.closing_counted_cash),
    expected_cash: row.expected_cash == null ? null : Number(row.expected_cash),
    cash_variance: row.cash_variance == null ? null : Number(row.cash_variance),
    totals_json: {
      ...EMPTY_REGISTER_TOTALS,
      ...totals,
    },
    opening_note: (row.opening_note as string | null) ?? null,
    closing_note: (row.closing_note as string | null) ?? null,
    opened_at: String(row.opened_at),
    closed_at: (row.closed_at as string | null) ?? null,
  }
}

async function appendEvent(input: {
  sessionId: string
  vendorId: string
  eventType: RegisterEventType
  actorId?: string | null
  payload?: Record<string, unknown>
}): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('register_session_events').insert({
    session_id: input.sessionId,
    vendor_id: input.vendorId,
    event_type: input.eventType,
    actor_id: input.actorId ?? null,
    payload: input.payload ?? {},
  })
  if (error) {
    console.warn('[register] appendEvent failed:', error.message)
  }
}

export async function getOpenRegisterSession(
  vendorId: string,
  terminalId?: string | null,
): Promise<RegisterSession | null> {
  const supabase = getSupabaseClient()
  let query = supabase
    .from('register_sessions')
    .select('*')
    .eq('vendor_id', vendorId)
    .eq('status', 'open')
    .order('opened_at', { ascending: false })
    .limit(1)

  if (terminalId) {
    query = query.eq('terminal_id', terminalId)
  }

  const { data, error } = await query.maybeSingle()
  if (error) {
    console.error('[register] getOpenRegisterSession:', error.message)
    throw new Error('Could not load register session')
  }
  return data ? mapSession(data as Record<string, unknown>) : null
}

export async function openRegisterSession(
  input: OpenRegisterInput,
): Promise<RegisterSession> {
  const existing = await getOpenRegisterSession(input.vendorId, input.terminalId)
  if (existing) {
    return existing
  }

  const supabase = getSupabaseClient()
  const float = roundMoney(Math.max(0, input.openingFloat))
  const { data, error } = await supabase
    .from('register_sessions')
    .insert({
      vendor_id: input.vendorId,
      terminal_id: input.terminalId.trim() || 'main',
      terminal_name: input.terminalName.trim() || 'Main register',
      cashier_user_id: input.cashierUserId,
      cashier_name: input.cashierName.trim() || 'Cashier',
      status: 'open',
      opening_float: float,
      expected_cash: float,
      totals_json: EMPTY_REGISTER_TOTALS,
      opening_note: input.openingNote?.trim() || null,
    })
    .select('*')
    .single()

  if (error || !data) {
    console.error('[register] openRegisterSession:', error?.message)
    throw new Error(error?.message || 'Could not open register')
  }

  const session = mapSession(data as Record<string, unknown>)
  await appendEvent({
    sessionId: session.id,
    vendorId: input.vendorId,
    eventType: 'opened',
    actorId: input.cashierUserId,
    payload: {
      opening_float: float,
      terminal_id: session.terminal_id,
      terminal_name: session.terminal_name,
    },
  })
  return session
}

export async function recordRegisterSale(input: {
  sessionId: string
  vendorId: string
  actorId?: string | null
  orderId: string
  method: RegisterPaymentMethod
  amount: number
  hold?: boolean
}): Promise<RegisterSession | null> {
  const supabase = getSupabaseClient()
  const { data: row, error } = await supabase
    .from('register_sessions')
    .select('*')
    .eq('id', input.sessionId)
    .eq('vendor_id', input.vendorId)
    .eq('status', 'open')
    .maybeSingle()

  if (error || !row) {
    console.warn('[register] recordRegisterSale: session missing')
    return null
  }

  const session = mapSession(row as Record<string, unknown>)
  const totals = { ...session.totals_json }
  const amount = roundMoney(Math.max(0, input.amount))

  if (input.hold) {
    totals.holds_count = (totals.holds_count ?? 0) + 1
  } else {
    totals[input.method] = roundMoney((totals[input.method] ?? 0) + amount)
    totals.sales_count = (totals.sales_count ?? 0) + 1
  }

  const expected = roundMoney(
    session.opening_float + (totals.cash ?? 0) - (totals.refunds_cash ?? 0),
  )

  const { data: updated, error: updateError } = await supabase
    .from('register_sessions')
    .update({
      totals_json: totals,
      expected_cash: expected,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.id)
    .select('*')
    .single()

  if (updateError || !updated) {
    console.warn('[register] recordRegisterSale update failed:', updateError?.message)
    return session
  }

  await appendEvent({
    sessionId: session.id,
    vendorId: input.vendorId,
    eventType: input.hold ? 'hold' : 'sale',
    actorId: input.actorId,
    payload: {
      order_id: input.orderId,
      method: input.method,
      amount,
      hold: input.hold === true,
    },
  })

  return mapSession(updated as Record<string, unknown>)
}

export async function recordRegisterRefund(input: {
  sessionId: string
  vendorId: string
  actorId?: string | null
  orderId: string
  method: RegisterPaymentMethod
  amount: number
}): Promise<RegisterSession | null> {
  const supabase = getSupabaseClient()
  const { data: row, error } = await supabase
    .from('register_sessions')
    .select('*')
    .eq('id', input.sessionId)
    .eq('vendor_id', input.vendorId)
    .maybeSingle()

  if (error || !row) return null

  const session = mapSession(row as Record<string, unknown>)
  if (session.status !== 'open') return session

  const totals = { ...session.totals_json }
  const amount = roundMoney(Math.max(0, input.amount))
  totals[input.method] = roundMoney(Math.max(0, (totals[input.method] ?? 0) - amount))
  if (input.method === 'cash') {
    totals.refunds_cash = roundMoney((totals.refunds_cash ?? 0) + amount)
  }
  totals.sales_count = Math.max(0, (totals.sales_count ?? 0) - 1)

  const expected = roundMoney(
    session.opening_float + (totals.cash ?? 0) - (totals.refunds_cash ?? 0),
  )

  const { data: updated, error: updateError } = await supabase
    .from('register_sessions')
    .update({
      totals_json: totals,
      expected_cash: expected,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.id)
    .select('*')
    .single()

  if (updateError || !updated) return session

  await appendEvent({
    sessionId: session.id,
    vendorId: input.vendorId,
    eventType: 'refund',
    actorId: input.actorId,
    payload: {
      order_id: input.orderId,
      method: input.method,
      amount,
    },
  })

  return mapSession(updated as Record<string, unknown>)
}

export async function closeRegisterSession(
  input: CloseRegisterInput,
): Promise<RegisterSession> {
  const supabase = getSupabaseClient()
  const { data: row, error } = await supabase
    .from('register_sessions')
    .select('*')
    .eq('id', input.sessionId)
    .eq('vendor_id', input.vendorId)
    .eq('status', 'open')
    .maybeSingle()

  if (error || !row) {
    throw new Error('No open register session to close')
  }

  const session = mapSession(row as Record<string, unknown>)
  const expected = expectedCashFromSession(session)
  const counted = roundMoney(Math.max(0, input.countedCash))
  const variance = roundMoney(counted - expected)
  const now = new Date().toISOString()

  const { data: updated, error: updateError } = await supabase
    .from('register_sessions')
    .update({
      status: 'closed',
      closing_counted_cash: counted,
      expected_cash: expected,
      cash_variance: variance,
      closing_note: input.closingNote?.trim() || null,
      closed_at: now,
      updated_at: now,
    })
    .eq('id', session.id)
    .select('*')
    .single()

  if (updateError || !updated) {
    throw new Error(updateError?.message || 'Could not close register')
  }

  await appendEvent({
    sessionId: session.id,
    vendorId: input.vendorId,
    eventType: 'closed',
    actorId: input.actorId,
    payload: {
      expected_cash: expected,
      counted_cash: counted,
      cash_variance: variance,
    },
  })

  return mapSession(updated as Record<string, unknown>)
}

export function terminalStorageKey(vendorId: string): string {
  return `foodma.register.terminal.${vendorId}`
}

export function lastFloatStorageKey(vendorId: string): string {
  return `foodma.register.lastFloat.${vendorId}`
}
