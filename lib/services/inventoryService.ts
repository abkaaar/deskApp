import { getSupabaseClient } from '@/lib/supabase/client'
import type {
  ApplyStockCountInput,
  InventoryAlert,
  InventoryAnalytics,
  InventoryItem,
  InventoryMovement,
  RecordMovementInput,
  UpsertInventoryItemInput,
  VendorInventorySettings,
} from '@/lib/types/inventory'

type ItemRow = Record<string, unknown> & {
  linked_post?: { title?: string } | { title?: string }[] | null
}

function mapItem(row: ItemRow): InventoryItem {
  const linkedRaw = row.linked_post
  const linked = Array.isArray(linkedRaw) ? linkedRaw[0] : linkedRaw

  return {
    id: String(row.id),
    vendor_id: String(row.vendor_id),
    name: String(row.name ?? ''),
    sku: (row.sku as string | null) ?? null,
    unit: String(row.unit ?? 'pcs'),
    item_type: (row.item_type as InventoryItem['item_type']) ?? 'ingredient',
    quantity_on_hand: Number(row.quantity_on_hand) || 0,
    reorder_level: Number(row.reorder_level) || 0,
    cost_per_unit: Number(row.cost_per_unit) || 0,
    tracking_method: (row.tracking_method as InventoryItem['tracking_method']) ?? 'quantity',
    level_value: (row.level_value as InventoryItem['level_value']) ?? null,
    linked_post_id: (row.linked_post_id as string | null) ?? null,
    linked_menu_title: linked?.title ?? null,
    notes: (row.notes as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

export class InventoryService {
  static async getItems(
    vendorId: string,
  ): Promise<{ data: InventoryItem[]; error: string | null }> {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*, linked_post:posts(title)')
        .eq('vendor_id', vendorId)
        .is('deleted_at', null)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error loading inventory items:', error)
        return { data: [], error: error.message || 'Failed to load inventory items' }
      }

      return { data: (data ?? []).map((row) => mapItem(row as ItemRow)), error: null }
    } catch (error) {
      console.error('Error in getItems:', error)
      return { data: [], error: 'Something went wrong while loading inventory' }
    }
  }

  static async getMovements(
    vendorId: string,
    limit = 50,
  ): Promise<{ data: InventoryMovement[]; error: string | null }> {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('*, item:inventory_items(name)')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error loading inventory movements:', error)
        return { data: [], error: error.message || 'Failed to load stock movements' }
      }

      const movements = (data ?? []).map((row) => {
        const itemRaw = (row as { item?: unknown }).item
        const item = Array.isArray(itemRaw) ? itemRaw[0] : itemRaw
        return {
          id: String(row.id),
          vendor_id: String(row.vendor_id),
          item_id: String(row.item_id),
          item_name: (item as { name?: string } | null)?.name ?? null,
          movement_type: row.movement_type as InventoryMovement['movement_type'],
          direction: (row.direction as InventoryMovement['direction']) ?? 'in',
          quantity: Number(row.quantity) || 0,
          notes: (row.notes as string | null) ?? null,
          created_at: String(row.created_at),
        }
      })

      return { data: movements, error: null }
    } catch (error) {
      console.error('Error in getMovements:', error)
      return { data: [], error: 'Something went wrong while loading movements' }
    }
  }

  static async getAlerts(
    vendorId: string,
  ): Promise<{ data: InventoryAlert[]; error: string | null }> {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('inventory_alerts')
        .select('*, item:inventory_items(name)')
        .eq('vendor_id', vendorId)
        .eq('resolved', false)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading inventory alerts:', error)
        return { data: [], error: error.message || 'Failed to load inventory alerts' }
      }

      const alerts = (data ?? []).map((row) => {
        const itemRaw = (row as { item?: unknown }).item
        const item = Array.isArray(itemRaw) ? itemRaw[0] : itemRaw
        return {
          id: String(row.id),
          vendor_id: String(row.vendor_id),
          item_id: String(row.item_id),
          item_name: (item as { name?: string } | null)?.name ?? null,
          alert_type: (row.alert_type as InventoryAlert['alert_type']) ?? 'low_stock',
          message: String(row.message ?? ''),
          resolved: row.resolved === true,
          created_at: String(row.created_at),
        }
      })

      return { data: alerts, error: null }
    } catch (error) {
      console.error('Error in getAlerts:', error)
      return { data: [], error: 'Something went wrong while loading alerts' }
    }
  }

  static async getSettings(
    vendorId: string,
  ): Promise<{ data: VendorInventorySettings | null; error: string | null }> {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('vendor_inventory_settings')
        .select('*')
        .eq('vendor_id', vendorId)
        .maybeSingle()

      if (error) {
        console.error('Error loading inventory settings:', error)
        return { data: null, error: error.message || 'Failed to load inventory settings' }
      }

      if (!data) {
        return {
          data: {
            vendor_id: vendorId,
            auto_disable_menu_on_zero_stock: true,
            low_stock_alerts_enabled: true,
            updated_at: new Date().toISOString(),
          },
          error: null,
        }
      }

      return { data: data as VendorInventorySettings, error: null }
    } catch (error) {
      console.error('Error in getSettings:', error)
      return { data: null, error: 'Something went wrong while loading settings' }
    }
  }

  static async updateSettings(
    vendorId: string,
    updates: Partial<Omit<VendorInventorySettings, 'vendor_id' | 'updated_at'>>,
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from('vendor_inventory_settings').upsert(
        {
          vendor_id: vendorId,
          ...updates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'vendor_id' },
      )

      if (error) {
        console.error('Error updating inventory settings:', error)
        return { success: false, error: error.message || 'Failed to update setting' }
      }

      return { success: true, error: null }
    } catch (error) {
      console.error('Error in updateSettings:', error)
      return { success: false, error: 'Something went wrong while updating settings' }
    }
  }

  static async recordMovement(
    input: RecordMovementInput,
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.rpc('record_inventory_movement', {
        p_item_id: input.itemId,
        p_movement_type: input.movementType,
        p_quantity: input.quantity,
        p_direction: input.direction,
        p_notes: input.notes ?? null,
      })

      if (error) {
        console.error('Error recording inventory movement:', error)
        return { success: false, error: error.message || 'Failed to record movement' }
      }

      return { success: true, error: null }
    } catch (error) {
      console.error('Error in recordMovement:', error)
      return { success: false, error: 'Something went wrong while recording movement' }
    }
  }

  static async upsertItem(
    input: UpsertInventoryItemInput,
  ): Promise<{ data: InventoryItem | null; error: string | null }> {
    try {
      const supabase = getSupabaseClient()
      const now = new Date().toISOString()

      const payload: Record<string, unknown> = {
        vendor_id: input.vendorId,
        name: input.name.trim(),
        unit: input.unit,
        item_type: input.itemType,
        reorder_level: input.reorderLevel ?? 0,
        cost_per_unit: input.costPerUnit ?? 0,
        linked_post_id: input.linkedPostId ?? null,
        notes: input.notes ?? null,
        tracking_method: input.tracking_method ?? 'quantity',
        level_value:
          (input.tracking_method ?? 'quantity') === 'level'
            ? (input.level_value ?? 'medium')
            : null,
        updated_at: now,
      }

      if (input.id) {
        const { data, error } = await supabase
          .from('inventory_items')
          .update(payload)
          .eq('id', input.id)
          .eq('vendor_id', input.vendorId)
          .select('*, linked_post:posts(title)')
          .single()

        if (error || !data) {
          console.error('Error updating inventory item:', error)
          return { data: null, error: error?.message || 'Failed to update item' }
        }

        return { data: mapItem(data as ItemRow), error: null }
      }

      const { data, error } = await supabase
        .from('inventory_items')
        .insert({ ...payload, quantity_on_hand: 0, created_at: now })
        .select('*, linked_post:posts(title)')
        .single()

      if (error || !data) {
        console.error('Error creating inventory item:', error)
        return { data: null, error: error?.message || 'Failed to create item' }
      }

      // Opening balance is written as a ledger movement so on-hand always traces to the ledger.
      if ((input.tracking_method ?? 'quantity') !== 'level' && (input.openingQuantity ?? 0) > 0) {
        const movement = await this.recordMovement({
          itemId: data.id,
          movementType: 'adjustment',
          quantity: input.openingQuantity ?? 0,
          direction: 'in',
          notes: 'Opening balance',
        })
        if (!movement.success) {
          return { data: null, error: movement.error }
        }
      } else if ((input.tracking_method ?? 'quantity') === 'level') {
        const levelQty =
          input.level_value === 'high' ? 3 : input.level_value === 'low' ? 1 : 2
        const movement = await this.recordMovement({
          itemId: data.id,
          movementType: 'adjustment',
          quantity: levelQty,
          direction: 'in',
          notes: `Opening level: ${input.level_value ?? 'medium'}`,
        })
        if (!movement.success) {
          return { data: null, error: movement.error }
        }
      }

      return { data: mapItem(data as ItemRow), error: null }
    } catch (error) {
      console.error('Error in upsertItem:', error)
      return { data: null, error: 'Something went wrong while saving the item' }
    }
  }

  static async applyStockCount(
    input: ApplyStockCountInput,
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.rpc('apply_inventory_stock_count', {
        p_item_id: input.itemId,
        p_counted_quantity: input.countedQuantity,
        p_notes: input.notes ?? null,
        p_stock_count_id: input.stockCountId ?? null,
        p_level_value: input.levelValue ?? null,
      })

      if (error) {
        console.error('Error applying stock count:', error)
        return { success: false, error: error.message || 'Failed to apply stock count' }
      }

      return { success: true, error: null }
    } catch (error) {
      console.error('Error in applyStockCount:', error)
      return { success: false, error: 'Something went wrong while applying stock count' }
    }
  }

  static async getAnalytics(
    vendorId: string,
    days = 30,
  ): Promise<{ data: InventoryAnalytics | null; error: string | null }> {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.rpc('get_vendor_inventory_analytics', {
        p_vendor_id: vendorId,
        p_days: days,
      })

      if (error) {
        console.error('Error loading inventory analytics:', error)
        return { data: null, error: error.message || 'Failed to load inventory analytics' }
      }

      return { data: (data ?? null) as InventoryAnalytics | null, error: null }
    } catch (error) {
      console.error('Error in getAnalytics:', error)
      return { data: null, error: 'Something went wrong while loading analytics' }
    }
  }
}
