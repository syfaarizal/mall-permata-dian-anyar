import { supabase } from '../../lib/supabase'
import type { ApprovalStatus, Category, Profile, Store } from '../../lib/types'

export type AdminProfile = Profile & { created_at: string; verified_by: 'admin' | 'otp' | null }
export type AdminStore = Store & {
  owner: Pick<Profile, 'id' | 'name' | 'block' | 'house_no' | 'wa_number' | 'phone_verified_at'> | null
}
export interface CommunitySettings {
  id: 1
  invite_code: string
  registration_open: boolean
  valid_blocks: string[]
  admin_wa_number: string | null
  require_seller_residency: boolean
  require_phone_otp: boolean
}

function check<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message)
  return r.data as T
}

export async function fetchAdminStores(): Promise<AdminStore[]> {
  return check(
    await supabase.from('stores').select('*, owner:profiles!owner_id(id,name,block,house_no,wa_number,phone_verified_at)').order('created_at', { ascending: false }),
  ) as AdminStore[]
}

export async function fetchAdminUsers(): Promise<AdminProfile[]> {
  return check(await supabase.from('profiles').select('*').order('created_at', { ascending: false })) as AdminProfile[]
}

export async function setStoreApproval(storeId: string, status: ApprovalStatus) {
  check(await supabase.rpc('admin_set_store_approval', { p_store: storeId, p_status: status }))
}

export async function verifyPhone(userId: string) {
  check(await supabase.rpc('admin_verify_phone', { p_user: userId }))
}

export async function setUserStatus(userId: string, status: 'active' | 'suspended') {
  check(await supabase.from('profiles').update({ status }).eq('id', userId).select().single())
}

export async function resetPin(userId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('admin-reset-pin', { body: { userId } })
  if (error || !data?.pin) throw new Error('Gagal mereset PIN. Pastikan fungsi admin-reset-pin sudah di-deploy.')
  return data.pin as string
}

export async function fetchSettings(): Promise<CommunitySettings> {
  return check(await supabase.from('community_settings').select('*').eq('id', 1).single()) as CommunitySettings
}

export async function saveSettings(patch: Partial<Omit<CommunitySettings, 'id'>>) {
  check(await supabase.from('community_settings').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', 1).select().single())
}

export async function addCategory(name: string, parentId: number | null, sortOrder: number): Promise<Category> {
  return check(await supabase.from('categories').insert({ name, parent_id: parentId, sort_order: sortOrder }).select().single()) as Category
}
export async function renameCategory(id: number, name: string) {
  check(await supabase.from('categories').update({ name }).eq('id', id).select().single())
}
export async function deleteCategory(id: number) {
  check(await supabase.from('categories').delete().eq('id', id).select())
}
