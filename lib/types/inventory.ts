export type InventoryItemType = 'ingredient' | 'finished_product' | 'packaging' | 'supply'

export type InventoryTrackingMethod =
  | 'quantity'
  | 'weight'
  | 'volume'
  | 'pack'
  | 'count'
  | 'variable_manual'
  | 'level'

export type InventoryLevelValue = 'low' | 'medium' | 'high'

export type InventoryMovementType =
  | 'purchase'
  | 'return'
  | 'production'
  | 'adjustment'
  | 'sale'
  | 'waste'
  | 'spoilage'
  | 'stock_count'

export type InventoryMovementDirection = 'in' | 'out'

export interface InventoryItem {
  id: string
  vendor_id: string
  name: string
  sku: string | null
  unit: string
  item_type: InventoryItemType
  quantity_on_hand: number
  reorder_level: number
  cost_per_unit: number
  tracking_method: InventoryTrackingMethod
  level_value: InventoryLevelValue | null
  linked_post_id: string | null
  linked_menu_title: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface InventoryMovement {
  id: string
  vendor_id: string
  item_id: string
  item_name?: string | null
  movement_type: InventoryMovementType
  direction: InventoryMovementDirection
  quantity: number
  notes: string | null
  created_at: string
}

export interface InventoryAlert {
  id: string
  vendor_id: string
  item_id: string
  item_name?: string | null
  alert_type: 'low_stock' | 'out_of_stock'
  message: string
  resolved: boolean
  created_at: string
}

export interface VendorInventorySettings {
  vendor_id: string
  auto_disable_menu_on_zero_stock: boolean
  low_stock_alerts_enabled: boolean
  updated_at: string
}

export interface InventoryAnalytics {
  period_days: number
  active_items: number
  low_stock_count: number
  out_of_stock_count: number
  on_hand_valuation: number
  waste_quantity: number
  waste_value: number
  purchase_quantity: number
  sale_quantity: number
  stock_count_variance_abs: number
  open_alerts: number
}

export type UpsertInventoryItemInput = {
  id?: string
  vendorId: string
  name: string
  unit: string
  itemType: InventoryItemType
  reorderLevel?: number
  costPerUnit?: number
  openingQuantity?: number
  linkedPostId?: string | null
  notes?: string | null
  tracking_method?: InventoryTrackingMethod
  level_value?: InventoryLevelValue | null
}

export type RecordMovementInput = {
  itemId: string
  movementType: InventoryMovementType
  quantity: number
  direction: InventoryMovementDirection
  notes?: string
}

export type ApplyStockCountInput = {
  itemId: string
  countedQuantity: number
  notes?: string
  levelValue?: InventoryLevelValue | null
  stockCountId?: string | null
}

export const INVENTORY_UNITS = [
  'pcs',
  'kg',
  'g',
  'l',
  'ml',
  'portion',
  'box',
  'pack',
  'bag',
  'keg',
  'carton',
  'crate',
] as const

export const ITEM_TYPE_LABELS: Record<InventoryItemType, string> = {
  ingredient: 'Ingredient',
  finished_product: 'Finished product',
  packaging: 'Packaging',
  supply: 'Supply',
}

export const TRACKING_METHOD_LABELS: Record<InventoryTrackingMethod, string> = {
  quantity: 'Quantity',
  weight: 'Weight',
  volume: 'Volume',
  pack: 'Pack / carton',
  count: 'Count',
  variable_manual: 'Variable (manual)',
  level: 'Level (Low / Med / High)',
}

export const LEVEL_VALUE_LABELS: Record<InventoryLevelValue, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

export const MOVEMENT_TYPE_LABELS: Record<InventoryMovementType, string> = {
  purchase: 'Purchase',
  return: 'Return',
  production: 'Production',
  adjustment: 'Adjustment',
  sale: 'Sale',
  waste: 'Waste',
  spoilage: 'Spoilage',
  stock_count: 'Stock count',
}
