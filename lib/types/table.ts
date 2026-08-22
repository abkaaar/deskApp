export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning'

export const TABLE_STATUS_LABELS: Record<TableStatus, string> = {
  available: 'Available',
  occupied: 'Occupied',
  reserved: 'Reserved',
  cleaning: 'Cleaning',
}

export interface RestaurantTable {
  id: string
  vendor_id: string
  label: string
  zone: string | null
  seats: number
  status: TableStatus
  sort_order: number
  merged_group_id: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RestaurantTableSession {
  id: string
  vendor_id: string
  table_id: string
  customer_id: string | null
  status: 'open' | 'reserved' | 'closed' | 'cancelled'
  guest_count: number | null
  party_name: string | null
  opened_at: string
  closed_at: string | null
  transferred_from_table_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type CreateRestaurantTableInput = {
  label: string
  zone?: string
  seats?: number
  sort_order?: number
  notes?: string
  status?: TableStatus
}

export type UpdateRestaurantTableInput = Partial<CreateRestaurantTableInput> & {
  is_active?: boolean
  merged_group_id?: string | null
}
