export type CustomerDisplayLine = {
  title: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export type CustomerDisplayState = {
  lines: CustomerDisplayLine[]
  orderType: string
  tableLabel: string | null
  customerName: string | null
  subtotal: number
  discount: number
  total: number
  itemCount: number
  phase: 'idle' | 'active' | 'paid'
  thankYouMessage?: string | null
}

export type CustomerDisplayInfo = {
  id: number
  label: string
  bounds: { x: number; y: number; width: number; height: number }
  isPrimary: boolean
}
