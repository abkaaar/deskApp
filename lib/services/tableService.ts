import { getSupabaseClient } from '@/lib/supabase/client'
import type {
  CreateRestaurantTableInput,
  RestaurantTable,
  RestaurantTableSession,
  TableStatus,
  UpdateRestaurantTableInput,
} from '@/lib/types/table'

const VALID_STATUSES: TableStatus[] = ['available', 'occupied', 'reserved', 'cleaning']

function mapTable(row: Record<string, unknown>): RestaurantTable {
  const status = VALID_STATUSES.includes(row.status as TableStatus)
    ? (row.status as TableStatus)
    : 'available'

  return {
    id: String(row.id),
    vendor_id: String(row.vendor_id),
    label: String(row.label ?? ''),
    zone: (row.zone as string | null) ?? null,
    seats: Number(row.seats) || 2,
    status,
    sort_order: Number(row.sort_order) || 0,
    merged_group_id: (row.merged_group_id as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    is_active: row.is_active !== false,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

function mapSession(row: Record<string, unknown>): RestaurantTableSession {
  return {
    id: String(row.id),
    vendor_id: String(row.vendor_id),
    table_id: String(row.table_id),
    customer_id: (row.customer_id as string | null) ?? null,
    status: (row.status as RestaurantTableSession['status']) || 'open',
    guest_count: row.guest_count == null ? null : Number(row.guest_count),
    party_name: (row.party_name as string | null) ?? null,
    opened_at: String(row.opened_at),
    closed_at: (row.closed_at as string | null) ?? null,
    transferred_from_table_id: (row.transferred_from_table_id as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

function missingTableError(code?: string) {
  return code === '42P01'
    ? 'Table layout tables not found. Run the SQL migration in Supabase first.'
    : null
}

export class TableService {
  static async getTables(
    vendorId: string,
  ): Promise<{ data: RestaurantTable[]; error: string | null }> {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .eq('vendor_id', vendorId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('label', { ascending: true })

      if (error) {
        return {
          data: [],
          error: missingTableError(error.code) || 'Failed to load tables',
        }
      }

      return {
        data: (data ?? []).map((row) => mapTable(row as Record<string, unknown>)),
        error: null,
      }
    } catch (error) {
      console.error('Error in getTables:', error)
      return { data: [], error: 'Something went wrong while loading tables' }
    }
  }

  static async getOpenSessions(
    vendorId: string,
  ): Promise<{ data: RestaurantTableSession[]; error: string | null }> {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('restaurant_table_sessions')
        .select('*')
        .eq('vendor_id', vendorId)
        .in('status', ['open', 'reserved'])
        .order('opened_at', { ascending: false })

      if (error) {
        return {
          data: [],
          error: missingTableError(error.code) || 'Failed to load table sessions',
        }
      }

      return {
        data: (data ?? []).map((row) => mapSession(row as Record<string, unknown>)),
        error: null,
      }
    } catch (error) {
      console.error('Error in getOpenSessions:', error)
      return { data: [], error: 'Something went wrong while loading sessions' }
    }
  }

  static async createTable(
    vendorId: string,
    input: CreateRestaurantTableInput,
  ): Promise<{ data: RestaurantTable | null; error: string | null }> {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('restaurant_tables')
        .insert({
          vendor_id: vendorId,
          label: input.label.trim().toUpperCase(),
          zone: input.zone?.trim() || null,
          seats: input.seats ?? 2,
          sort_order: input.sort_order ?? 0,
          notes: input.notes?.trim() || null,
          status: input.status ?? 'available',
        })
        .select('*')
        .single()

      if (error) {
        return {
          data: null,
          error: missingTableError(error.code) || error.message || 'Failed to create table',
        }
      }

      return { data: mapTable(data as Record<string, unknown>), error: null }
    } catch (error) {
      console.error('Error in createTable:', error)
      return { data: null, error: 'Something went wrong while creating table' }
    }
  }

  static async updateTable(
    vendorId: string,
    tableId: string,
    input: UpdateRestaurantTableInput,
  ): Promise<{ data: RestaurantTable | null; error: string | null }> {
    try {
      const supabase = getSupabaseClient()
      const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      if (input.label !== undefined) payload.label = input.label.trim().toUpperCase()
      if (input.zone !== undefined) payload.zone = input.zone?.trim() || null
      if (input.seats !== undefined) payload.seats = input.seats
      if (input.sort_order !== undefined) payload.sort_order = input.sort_order
      if (input.notes !== undefined) payload.notes = input.notes?.trim() || null
      if (input.status !== undefined) payload.status = input.status
      if (input.is_active !== undefined) payload.is_active = input.is_active
      if (input.merged_group_id !== undefined) payload.merged_group_id = input.merged_group_id

      const { data, error } = await supabase
        .from('restaurant_tables')
        .update(payload)
        .eq('vendor_id', vendorId)
        .eq('id', tableId)
        .select('*')
        .single()

      if (error) {
        return {
          data: null,
          error: missingTableError(error.code) || 'Failed to update table',
        }
      }

      return { data: mapTable(data as Record<string, unknown>), error: null }
    } catch (error) {
      console.error('Error in updateTable:', error)
      return { data: null, error: 'Something went wrong while updating table' }
    }
  }

  static async setStatus(
    vendorId: string,
    tableId: string,
    status: TableStatus,
    options?: { partyName?: string; guestCount?: number },
  ): Promise<{ data: RestaurantTable | null; error: string | null }> {
    try {
      const supabase = getSupabaseClient()

      if (status === 'occupied' || status === 'reserved') {
        const { data: openSession } = await supabase
          .from('restaurant_table_sessions')
          .select('id')
          .eq('vendor_id', vendorId)
          .eq('table_id', tableId)
          .in('status', ['open', 'reserved'])
          .maybeSingle()

        if (!openSession) {
          await supabase.from('restaurant_table_sessions').insert({
            vendor_id: vendorId,
            table_id: tableId,
            status: status === 'reserved' ? 'reserved' : 'open',
            party_name: options?.partyName?.trim() || null,
            guest_count: options?.guestCount ?? null,
          })
        }
      }

      if (status === 'available' || status === 'cleaning') {
        await supabase
          .from('restaurant_table_sessions')
          .update({
            status: 'closed',
            closed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('vendor_id', vendorId)
          .eq('table_id', tableId)
          .in('status', ['open', 'reserved'])
      }

      return this.updateTable(vendorId, tableId, { status })
    } catch (error) {
      console.error('Error in setStatus:', error)
      return { data: null, error: 'Something went wrong while updating table status' }
    }
  }

  static async transferTable(
    fromTableId: string,
    toTableId: string,
  ): Promise<{ data: RestaurantTable | null; error: string | null }> {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.rpc('transfer_restaurant_table', {
        p_from_table_id: fromTableId,
        p_to_table_id: toTableId,
      })

      if (error) {
        return { data: null, error: error.message || 'Failed to transfer table' }
      }

      return { data: mapTable(data as Record<string, unknown>), error: null }
    } catch (error) {
      console.error('Error in transferTable:', error)
      return { data: null, error: 'Something went wrong while transferring table' }
    }
  }

  static async mergeTables(
    tableIds: string[],
  ): Promise<{ groupId: string | null; error: string | null }> {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.rpc('merge_restaurant_tables', {
        p_table_ids: tableIds,
      })

      if (error) {
        return { groupId: null, error: error.message || 'Failed to merge tables' }
      }

      return { groupId: data as string, error: null }
    } catch (error) {
      console.error('Error in mergeTables:', error)
      return { groupId: null, error: 'Something went wrong while merging tables' }
    }
  }

  static async unmergeTables(
    groupId: string,
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.rpc('unmerge_restaurant_tables', {
        p_group_id: groupId,
      })

      if (error) {
        return { success: false, error: error.message || 'Failed to unmerge tables' }
      }

      return { success: true, error: null }
    } catch (error) {
      console.error('Error in unmergeTables:', error)
      return { success: false, error: 'Something went wrong while unmerging tables' }
    }
  }

  static async splitBill(
    vendorId: string,
    sessionId: string,
    orderId: number,
    splitLabel: string,
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabase = getSupabaseClient()
      const { data: session } = await supabase
        .from('restaurant_table_sessions')
        .select('id')
        .eq('id', sessionId)
        .eq('vendor_id', vendorId)
        .maybeSingle()

      if (!session) {
        return { success: false, error: 'Session not found' }
      }

      const { error } = await supabase.from('restaurant_table_session_orders').upsert(
        {
          session_id: sessionId,
          order_id: orderId,
          split_label: splitLabel.trim() || null,
        },
        { onConflict: 'session_id,order_id' },
      )

      if (error) {
        return {
          success: false,
          error: missingTableError(error.code) || 'Failed to split bill',
        }
      }

      return { success: true, error: null }
    } catch (error) {
      console.error('Error in splitBill:', error)
      return { success: false, error: 'Something went wrong while splitting bill' }
    }
  }

  static async deleteTable(
    vendorId: string,
    tableId: string,
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('restaurant_tables')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('vendor_id', vendorId)
        .eq('id', tableId)

      if (error) {
        return {
          success: false,
          error: missingTableError(error.code) || 'Failed to remove table',
        }
      }

      return { success: true, error: null }
    } catch (error) {
      console.error('Error in deleteTable:', error)
      return { success: false, error: 'Something went wrong while removing table' }
    }
  }
}
