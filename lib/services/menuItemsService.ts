import { getSupabaseClient } from '@/lib/supabase/client'
import type { MenuItemAddon } from '@/lib/types/menu'

export class MenuItemsService {
  static async getMenuItems(
    postId: string,
  ): Promise<{ data: MenuItemAddon[]; error: string | null }> {
    try {
      const supabase = getSupabaseClient()

      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching menu items:', error)
        return { data: [], error: 'Failed to fetch add-ons' }
      }

      const menuItems: MenuItemAddon[] = (data ?? []).map((item, index) => ({
        id: item.id?.toString() || `${postId}_${index}`,
        title: item.title || '',
        price: item.price?.toString() || '0',
      }))

      return { data: menuItems, error: null }
    } catch (error) {
      console.error('Error in getMenuItems:', error)
      return { data: [], error: 'Something went wrong while fetching add-ons' }
    }
  }

  static async createMenuItems(
    postId: string,
    menuItems: { title: string; price: number }[],
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      if (menuItems.length === 0) return { success: true, error: null }

      const supabase = getSupabaseClient()
      const rows = menuItems.map((item) => ({
        post_id: postId,
        title: item.title.trim(),
        price: item.price,
        created_at: new Date().toISOString(),
      }))

      const { error } = await supabase.from('menu_items').insert(rows)

      if (error) {
        console.error('Error creating menu items:', error)
        return { success: false, error: 'Failed to create add-ons' }
      }

      return { success: true, error: null }
    } catch (error) {
      console.error('Error in createMenuItems:', error)
      return { success: false, error: 'Something went wrong while creating add-ons' }
    }
  }
}
