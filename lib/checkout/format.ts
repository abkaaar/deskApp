const currencyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) return currencyFormatter.format(0)
  return currencyFormatter.format(amount)
}

export function parseKeypadAmount(value: string): number {
  const normalized = value.replace(/,/g, '').trim()
  if (!normalized) return 0
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}
