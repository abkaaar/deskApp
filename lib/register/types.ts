export type RegisterSessionStatus = 'open' | 'closed'

export type RegisterPaymentMethod = 'cash' | 'card' | 'transfer' | 'wallet'

export type RegisterEventType =
  | 'opened'
  | 'closed'
  | 'sale'
  | 'hold'
  | 'refund'
  | 'void'

export type RegisterSessionTotals = {
  cash: number
  card: number
  transfer: number
  wallet: number
  sales_count: number
  refunds_cash: number
  holds_count: number
}

export type RegisterSession = {
  id: string
  vendor_id: string
  terminal_id: string
  terminal_name: string
  cashier_user_id: string | null
  cashier_name: string
  status: RegisterSessionStatus
  opening_float: number
  closing_counted_cash: number | null
  expected_cash: number | null
  cash_variance: number | null
  totals_json: RegisterSessionTotals
  opening_note: string | null
  closing_note: string | null
  opened_at: string
  closed_at: string | null
}

export type OpenRegisterInput = {
  vendorId: string
  terminalId: string
  terminalName: string
  cashierUserId: string
  cashierName: string
  openingFloat: number
  openingNote?: string | null
}

export type CloseRegisterInput = {
  sessionId: string
  vendorId: string
  countedCash: number
  closingNote?: string | null
  actorId?: string | null
}

export const EMPTY_REGISTER_TOTALS: RegisterSessionTotals = {
  cash: 0,
  card: 0,
  transfer: 0,
  wallet: 0,
  sales_count: 0,
  refunds_cash: 0,
  holds_count: 0,
}

export function expectedCashFromSession(session: RegisterSession): number {
  const t = session.totals_json
  return roundMoney(session.opening_float + (t.cash ?? 0) - (t.refunds_cash ?? 0))
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
