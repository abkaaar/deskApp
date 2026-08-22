import { getSupabaseClient } from '@/lib/supabase/client'
import type {
  CreateVendorCustomerInput,
  FavoriteMeal,
  UpdateVendorCustomerInput,
  VendorCustomer,
} from '@/lib/types/customer'

function normalizeFavoriteMeals(value: unknown): FavoriteMeal[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const title = typeof row.title === 'string' ? row.title : ''
      if (!title) return null
      return {
        post_id: typeof row.post_id === 'string' ? row.post_id : null,
        title,
        order_count: Number(row.order_count) || 0,
      } satisfies FavoriteMeal
    })
    .filter((item): item is FavoriteMeal => item != null)
}

function mapCustomer(row: Record<string, unknown>): VendorCustomer {
  return {
    id: String(row.id),
    vendor_id: String(row.vendor_id),
    profile_id: (row.profile_id as string | null) ?? null,
    name: (row.name as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    total_orders: Number(row.total_orders) || 0,
    lifetime_spend: Number(row.lifetime_spend) || 0,
    favorite_meals: normalizeFavoriteMeals(row.favorite_meals),
    last_order_at: (row.last_order_at as string | null) ?? null,
    is_active: row.is_active !== false,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

function missingTableError(code?: string) {
  return code === '42P01'
    ? 'Customer tables not found. Run the SQL migration in Supabase first.'
    : null
}

export class CustomerService {
  static async getCustomers(
    vendorId: string,
  ): Promise<{ data: VendorCustomer[]; error: string | null }> {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('vendor_customers')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('updated_at', { ascending: false })

      if (error) {
        return {
          data: [],
          error: missingTableError(error.code) || 'Failed to load customers',
        }
      }

      return {
        data: (data ?? []).map((row) => mapCustomer(row as Record<string, unknown>)),
        error: null,
      }
    } catch (error) {
      console.error('Error in getCustomers:', error)
      return { data: [], error: 'Something went wrong while loading customers' }
    }
  }

  static async createCustomer(
    vendorId: string,
    input: CreateVendorCustomerInput,
  ): Promise<{ data: VendorCustomer | null; error: string | null }> {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('vendor_customers')
        .insert({
          vendor_id: vendorId,
          name: input.name?.trim() || null,
          phone: input.phone?.trim() || null,
          email: input.email?.trim() || null,
          address: input.address?.trim() || null,
          notes: input.notes?.trim() || null,
          profile_id: input.profile_id || null,
        })
        .select('*')
        .single()

      if (error) {
        return {
          data: null,
          error: missingTableError(error.code) || error.message || 'Failed to create customer',
        }
      }

      return { data: mapCustomer(data as Record<string, unknown>), error: null }
    } catch (error) {
      console.error('Error in createCustomer:', error)
      return { data: null, error: 'Something went wrong while creating customer' }
    }
  }

  static async updateCustomer(
    vendorId: string,
    customerId: string,
    input: UpdateVendorCustomerInput,
  ): Promise<{ data: VendorCustomer | null; error: string | null }> {
    try {
      const supabase = getSupabaseClient()
      const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      if (input.name !== undefined) payload.name = input.name?.trim() || null
      if (input.phone !== undefined) payload.phone = input.phone?.trim() || null
      if (input.email !== undefined) payload.email = input.email?.trim() || null
      if (input.address !== undefined) payload.address = input.address?.trim() || null
      if (input.notes !== undefined) payload.notes = input.notes?.trim() || null
      if (input.profile_id !== undefined) payload.profile_id = input.profile_id || null
      if (input.is_active !== undefined) payload.is_active = input.is_active
      if (input.total_orders !== undefined) payload.total_orders = input.total_orders
      if (input.lifetime_spend !== undefined) payload.lifetime_spend = input.lifetime_spend
      if (input.favorite_meals !== undefined) payload.favorite_meals = input.favorite_meals
      if (input.last_order_at !== undefined) payload.last_order_at = input.last_order_at

      const { data, error } = await supabase
        .from('vendor_customers')
        .update(payload)
        .eq('vendor_id', vendorId)
        .eq('id', customerId)
        .select('*')
        .single()

      if (error) {
        return {
          data: null,
          error: missingTableError(error.code) || 'Failed to update customer',
        }
      }

      return { data: mapCustomer(data as Record<string, unknown>), error: null }
    } catch (error) {
      console.error('Error in updateCustomer:', error)
      return { data: null, error: 'Something went wrong while updating customer' }
    }
  }

  static async deleteCustomer(
    vendorId: string,
    customerId: string,
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('vendor_customers')
        .delete()
        .eq('vendor_id', vendorId)
        .eq('id', customerId)

      if (error) {
        return {
          success: false,
          error: missingTableError(error.code) || 'Failed to delete customer',
        }
      }

      return { success: true, error: null }
    } catch (error) {
      console.error('Error in deleteCustomer:', error)
      return { success: false, error: 'Something went wrong while deleting customer' }
    }
  }
}
