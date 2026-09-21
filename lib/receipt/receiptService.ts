import { toast } from 'sonner'

import type { OrderType, PaymentMethod } from '@/lib/checkout/types'
import type { Order } from '@/lib/types/order'
import { parsePosNotes } from '@/lib/checkout/pos-order'
import { buildReceiptText as legacyBuildReceiptText } from '@/lib/checkout/refundReceipt'

export type ReceiptLine = {
  title: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export type ReceiptData = {
  orderId: string
  restaurantName: string
  orderType: OrderType | string
  paymentMethod: PaymentMethod | string
  paymentReference?: string | null
  cashTendered?: number | null
  changeDue?: number | null
  customerName?: string | null
  tableLabel?: string | null
  lines: ReceiptLine[]
  subtotal: number
  discount: number
  total: number
  createdAt: string
  refunded?: boolean
}

export type ReceiptSettings = {
  autoPrint: boolean
  autoShow: boolean
  businessHeader: string
}

const SETTINGS_KEYS = {
  autoPrint: 'receipt_auto_print',
  autoShow: 'receipt_auto_show',
  businessHeader: 'receipt_business_header',
} as const

export async function loadReceiptSettings(): Promise<ReceiptSettings> {
  try {
    const [autoPrint, autoShow, businessHeader] = await Promise.all([
      window.api.settings.get(SETTINGS_KEYS.autoPrint),
      window.api.settings.get(SETTINGS_KEYS.autoShow),
      window.api.settings.get(SETTINGS_KEYS.businessHeader),
    ])
    return {
      autoPrint: autoPrint === '1' || autoPrint === 'true',
      autoShow: autoShow !== '0' && autoShow !== 'false',
      businessHeader: businessHeader?.trim() || '',
    }
  } catch {
    return { autoPrint: false, autoShow: true, businessHeader: '' }
  }
}

export async function saveReceiptSettings(settings: ReceiptSettings): Promise<void> {
  await window.api.settings.set(SETTINGS_KEYS.autoPrint, settings.autoPrint ? '1' : '0')
  await window.api.settings.set(SETTINGS_KEYS.autoShow, settings.autoShow ? '1' : '0')
  await window.api.settings.set(SETTINGS_KEYS.businessHeader, settings.businessHeader.trim())
}

export function buildReceipt(data: ReceiptData): { text: string; data: ReceiptData } {
  const header = data.restaurantName.trim() || 'Foodma'
  const parts = [
    header,
    '----------------',
    `Order: ${data.orderId.slice(0, 8)}`,
    `Date: ${new Date(data.createdAt).toLocaleString('en-NG')}`,
    `Type: ${data.orderType}`,
    `Pay: ${data.paymentMethod}`,
  ]
  if (data.paymentReference) parts.push(`Ref: ${data.paymentReference}`)
  if (data.tableLabel) parts.push(`Table: ${data.tableLabel}`)
  if (data.customerName) parts.push(`Customer: ${data.customerName}`)
  parts.push('----------------')
  for (const line of data.lines) {
    parts.push(
      `${line.quantity} x ${line.title}  ₦${Math.round(line.subtotal).toLocaleString('en-NG')}`,
    )
  }
  if (data.discount > 0) {
    parts.push(`Discount: -₦${Math.round(data.discount).toLocaleString('en-NG')}`)
  }
  parts.push('----------------')
  parts.push(`TOTAL: ₦${Math.round(data.total).toLocaleString('en-NG')}`)
  if (data.cashTendered != null) {
    parts.push(`Tendered: ₦${Math.round(data.cashTendered).toLocaleString('en-NG')}`)
  }
  if (data.changeDue != null && data.changeDue > 0) {
    parts.push(`Change: ₦${Math.round(data.changeDue).toLocaleString('en-NG')}`)
  }
  parts.push(data.refunded ? 'REFUNDED' : 'PAID')
  return { text: parts.join('\n'), data }
}

export function receiptFromOrder(order: Order, restaurantName?: string | null): ReceiptData {
  const meta = parsePosNotes(order.notes)
  const lines = (order.line_items ?? []).map((line) => ({
    title: line.post?.title || line.notes || 'Item',
    quantity: line.quantity,
    unitPrice: Number(line.unit_price) || 0,
    subtotal: Number(line.subtotal) || 0,
  }))
  return {
    orderId: String(order.id),
    restaurantName: restaurantName?.trim() || 'Foodma',
    orderType: meta?.orderType ?? order.delivery_method ?? 'takeaway',
    paymentMethod: meta?.paymentMethod ?? order.payment_status ?? 'cash',
    paymentReference: meta?.paymentReference ?? order.payment_reference,
    customerName: meta?.customerName,
    tableLabel: meta?.tableId,
    lines:
      lines.length > 0
        ? lines
        : [
            {
              title: 'Sale',
              quantity: 1,
              unitPrice: Number(order.total) || 0,
              subtotal: Number(order.total) || 0,
            },
          ],
    subtotal: Number(order.subtotal) || 0,
    discount: Number(order.promo_discount) || 0,
    total: Number(order.total) || 0,
    createdAt: order.created_at,
    refunded: order.payment_status === 'refunded',
  }
}

export async function shareReceiptText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    toast.success('Receipt copied')
  } catch {
    window.alert(text)
  }
}

/** System print via a temporary window (works in Electron / Chromium). */
export function printReceiptText(text: string): void {
  const w = window.open('', '_blank', 'noopener,noreferrer,width=420,height=640')
  if (!w) {
    toast.error('Could not open print window')
    return
  }
  w.document.write(
    `<!doctype html><html><head><title>Receipt</title>
    <style>
      body { font-family: ui-monospace, monospace; white-space: pre-wrap; padding: 16px; font-size: 13px; }
      @media print { body { padding: 0; } }
    </style></head><body>${text.replace(/</g, '&lt;')}</body></html>`,
  )
  w.document.close()
  w.focus()
  w.print()
}

export function displayReceiptText(text: string): void {
  window.alert(text)
}

export async function runPostSaleReceipt(
  data: ReceiptData,
  settings: ReceiptSettings,
): Promise<void> {
  const header = settings.businessHeader.trim() || data.restaurantName
  const built = buildReceipt({ ...data, restaurantName: header })
  if (settings.autoShow) {
    displayReceiptText(built.text)
  }
  if (settings.autoPrint) {
    printReceiptText(built.text)
  }
}

/** Back-compat wrapper used by Transactions. */
export function buildReceiptText(order: Order, restaurantName?: string | null): string {
  return legacyBuildReceiptText(order, restaurantName)
}
