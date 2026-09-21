import { getSupabaseClient } from '@/lib/supabase/client'
import type { CreateMenuItemInput, MenuPost, MenuPostUpdate } from '@/lib/types/menu'
import { assertDesktopEntitled } from '@/lib/auth/assertDesktopEntitled'

import { MenuItemsService } from './menuItemsService'

export class MenuService {
  static async getVendorMenu(vendorId: string): Promise<{ data: MenuPost[]; error: string | null }> {
    try {
      const supabase = getSupabaseClient()

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', vendorId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching menu:', error)
        return { data: [], error: 'Failed to load menu' }
      }

      return { data: (data ?? []) as MenuPost[], error: null }
    } catch (error) {
      console.error('Error in getVendorMenu:', error)
      return { data: [], error: 'Something went wrong while loading menu' }
    }
  }

  static async updateMenuItem(
    postId: string,
    vendorId: string,
    updates: MenuPostUpdate,
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const entitled = await assertDesktopEntitled(vendorId)
      if (!entitled.ok) return { success: false, error: entitled.error }

      const supabase = getSupabaseClient()

      const { data: postData, error: fetchError } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .is('deleted_at', null)
        .single()

      if (fetchError || !postData) {
        return { success: false, error: 'Menu item not found' }
      }

      if (postData.user_id !== vendorId) {
        return { success: false, error: 'You can only update your own menu items' }
      }

      const { error: updateError } = await supabase
        .from('posts')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId)
        .eq('user_id', vendorId)
        .is('deleted_at', null)

      if (updateError) {
        console.error('Error updating menu item:', updateError)
        return { success: false, error: 'Failed to update menu item' }
      }

      return { success: true, error: null }
    } catch (error) {
      console.error('Error in updateMenuItem:', error)
      return { success: false, error: 'Something went wrong while updating menu item' }
    }
  }

  static async toggleAvailability(
    postId: string,
    vendorId: string,
    isAvailable: boolean,
  ): Promise<{ success: boolean; error: string | null }> {
    return this.updateMenuItem(postId, vendorId, { is_available: isAvailable })
  }

  static async uploadMenuImage(
    vendorId: string,
    file: File,
  ): Promise<{ url: string | null; error: string | null }> {
    try {
      const entitled = await assertDesktopEntitled(vendorId)
      if (!entitled.ok) return { url: null, error: entitled.error }

      const supabase = getSupabaseClient()
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg'
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${safeExt}`
      const filePath = `posts/${vendorId}/${fileName}`

      const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || `image/${safeExt}`,
      })

      if (uploadError) {
        console.error('Error uploading menu image:', uploadError)
        return { url: null, error: 'Failed to upload image' }
      }

      const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath)
      return { url: urlData.publicUrl || null, error: null }
    } catch (error) {
      console.error('Error in uploadMenuImage:', error)
      return { url: null, error: 'Something went wrong while uploading the image' }
    }
  }

  static async createMenuItem(
    vendorId: string,
    username: string,
    input: CreateMenuItemInput,
  ): Promise<{ data: MenuPost | null; error: string | null }> {
    try {
      const entitled = await assertDesktopEntitled(vendorId)
      if (!entitled.ok) return { data: null, error: entitled.error }

      const title = input.title.trim()
      if (!title) {
        return { data: null, error: 'Title is required' }
      }

      const supabase = getSupabaseClient()
      const now = new Date().toISOString()

      const { data: createdPost, error: postError } = await supabase
        .from('posts')
        .insert({
          title,
          description: input.description?.trim() || '',
          category: input.category?.trim() || null,
          price: input.price ?? null,
          image_url: input.image_url ?? null,
          user_id: vendorId,
          username,
          created_at: now,
          updated_at: now,
          stock_quantity: input.stock_quantity ?? null,
          is_available: input.is_available ?? true,
          prep_time_minutes: input.prep_time_minutes ?? null,
          availability_type: 'always',
        })
        .select('*')
        .single()

      if (postError || !createdPost) {
        console.error('Error creating menu item:', postError)
        return { data: null, error: 'Failed to create menu item' }
      }

      if (input.addons && input.addons.length > 0) {
        const addonResult = await MenuItemsService.createMenuItems(createdPost.id, input.addons)
        if (!addonResult.success) {
          console.warn('Menu item created but add-ons failed:', addonResult.error)
        }
      }

      return { data: createdPost as MenuPost, error: null }
    } catch (error) {
      console.error('Error in createMenuItem:', error)
      return { data: null, error: 'Something went wrong while creating the menu item' }
    }
  }

  static async softDeleteMenuItem(
    postId: string,
    vendorId: string,
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const entitled = await assertDesktopEntitled(vendorId)
      if (!entitled.ok) return { success: false, error: entitled.error }

      const supabase = getSupabaseClient()

      const { error } = await supabase
        .from('posts')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: vendorId,
        })
        .eq('id', postId)
        .eq('user_id', vendorId)
        .is('deleted_at', null)

      if (error) {
        console.error('Error deleting menu item:', error)
        return { success: false, error: 'Failed to remove menu item' }
      }

      return { success: true, error: null }
    } catch (error) {
      console.error('Error in softDeleteMenuItem:', error)
      return { success: false, error: 'Something went wrong while removing menu item' }
    }
  }
}
