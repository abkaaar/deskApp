export type StockStatus = 'healthy' | 'low_stock' | 'out_of_stock'

export function computeStockStatus(
  quantityOnHand: number,
  reorderLevel: number,
): StockStatus {
  if (quantityOnHand <= 0) return 'out_of_stock'
  if (reorderLevel > 0 && quantityOnHand <= reorderLevel) return 'low_stock'
  return 'healthy'
}
