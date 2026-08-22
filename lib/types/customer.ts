export type FavoriteMeal = {
  post_id: string | null
  title: string
  order_count: number
}

export interface VendorCustomer {
  id: string
  vendor_id: string
  profile_id: string | null
  name: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  total_orders: number
  lifetime_spend: number
  favorite_meals: FavoriteMeal[]
  last_order_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type CreateVendorCustomerInput = {
  name?: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  profile_id?: string
}

export type UpdateVendorCustomerInput = Partial<CreateVendorCustomerInput> & {
  is_active?: boolean
  total_orders?: number
  lifetime_spend?: number
  favorite_meals?: FavoriteMeal[]
  last_order_at?: string | null
}
