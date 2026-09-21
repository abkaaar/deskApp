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
  reorder_quantity: number
  cost_per_unit: number
  tracking_method: InventoryTrackingMethod
  level_value: InventoryLevelValue | null
  linked_post_id: string | null
  linked_menu_title: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface InventoryRecipeLine {
  id: string
  inventory_item_id: string
  item_name?: string | null
  quantity: number
  unit: string
}

export interface InventoryRecipe {
  id: string
  vendor_id: string
  post_id: string
  post_title?: string | null
  name: string
  yield_portions: number
  is_active: boolean
  notes: string | null
  lines: InventoryRecipeLine[]
}

export interface InventoryVariance {
  inventory_item_id: string
  name: string
  unit: string
  on_hand: number
  cost_per_unit: number
  expected_usage: number
  ledger_usage: number
  usage_variance: number
  usage_variance_value: number
  stock_count_delta: number
  stock_count_variance_value: number
  reorder_level: number
  reorder_quantity: number
  suggested_reorder: number
  period_from: string
  period_to: string
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
  purchase_value?: number
  sale_quantity: number
  cogs_proxy?: number
  stock_count_variance_abs: number
  stock_count_variance_value?: number
  open_alerts: number
}

export type UpsertInventoryItemInput = {
  id?: string
  vendorId: string
  name: string
  unit: string
  itemType: InventoryItemType
  reorderLevel?: number
  reorderQuantity?: number
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
  unitCost?: number | null
}

export type UpsertInventoryRecipeInput = {
  id?: string
  vendorId: string
  postId: string
  name: string
  yieldPortions: number
  notes?: string | null
  lines: Array<{ inventoryItemId: string; quantity: number; unit: string }>
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
