export interface MenuPost {
  id: string
  title: string
  description: string
  category: string
  price: number | null
  image_url: string | null
  user_id: string
  created_at: string
  updated_at: string
  stock_quantity?: number | null
  is_available?: boolean
  prep_time_minutes?: number | null
  fulfilment_mode?: 'ready' | 'made_to_order' | null
  view_count?: number
}

export interface MenuItemAddon {
  id: string
  title: string
  price: string
}

export type MenuPostUpdate = Partial<
  Pick<
    MenuPost,
    | 'title'
    | 'description'
    | 'category'
    | 'price'
    | 'stock_quantity'
    | 'is_available'
    | 'prep_time_minutes'
    | 'fulfilment_mode'
  >
>

export type CreateMenuItemInput = {
  title: string
  description?: string
  category?: string
  price?: number | null
  stock_quantity?: number | null
  prep_time_minutes?: number | null
  is_available?: boolean
  image_url?: string | null
  addons?: { title: string; price: number }[]
}

export type CreateMenuAddonDraft = {
  id: string
  title: string
  price: string
}
