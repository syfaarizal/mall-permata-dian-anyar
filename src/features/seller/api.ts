import { supabase } from '../../lib/supabase'
import { makeSlug } from '../../lib/slug'
import type { Category, Product, Store } from '../../lib/types'
import type { toProductPayload, toStorePayload } from './validation'

type StorePayload = ReturnType<typeof toStorePayload>
type ProductPayload = ReturnType<typeof toProductPayload>

function check<T>(r: { data: T | null; error: { message: string; code?: string } | null }): T {
  if (r.error) throw new Error(r.error.message)
  return r.data as T
}

export async function fetchMyStore(uid: string): Promise<Store | null> {
  return check(await supabase.from('stores').select('*').eq('owner_id', uid).maybeSingle()) as Store | null
}

export async function fetchCategories(): Promise<Category[]> {
  return check(await supabase.from('categories').select('*').order('sort_order')) as Category[]
}

export async function saveStore(uid: string, existing: Store | null, payload: StorePayload): Promise<Store> {
  if (existing) {
    return check(await supabase.from('stores').update(payload).eq('id', existing.id).select().single()) as Store
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await supabase.from('stores').insert({ ...payload, owner_id: uid, slug: makeSlug(payload.name) }).select().single()
    if (r.error?.code === '23505') continue // slug bentrok, coba lagi
    return check(r) as Store
  }
  throw new Error('Gagal membuat toko. Coba lagi.')
}

export async function setStoreOverride(id: string, value: Store['open_override']) {
  check(await supabase.from('stores').update({ open_override: value }).eq('id', id).select().single())
}

export async function fetchProducts(storeId: string): Promise<Product[]> {
  return check(
    await supabase.from('products').select('*').eq('store_id', storeId).eq('is_active', true).order('sort_order').order('created_at', { ascending: false }),
  ) as Product[]
}

export async function fetchProduct(id: string): Promise<Product | null> {
  return check(await supabase.from('products').select('*').eq('id', id).maybeSingle()) as Product | null
}

export async function saveProduct(storeId: string, id: string | null, payload: ProductPayload): Promise<Product> {
  const q = id
    ? supabase.from('products').update(payload).eq('id', id)
    : supabase.from('products').insert({ ...payload, store_id: storeId })
  return check(await q.select().single()) as Product
}

export async function setProductAvailable(id: string, value: boolean) {
  check(await supabase.from('products').update({ is_available: value }).eq('id', id).select().single())
}

/** Hapus lembut: produk disembunyikan, datanya tetap ada. */
export async function archiveProduct(id: string) {
  check(await supabase.from('products').update({ is_active: false }).eq('id', id).select().single())
}

export async function uploadImage(uid: string, folder: 'products' | 'qris' | 'cover' | 'logo', blob: Blob): Promise<string> {
  const path = `${uid}/${folder}/${crypto.randomUUID()}.webp`
  const { error } = await supabase.storage.from('media').upload(path, blob, { contentType: 'image/webp', cacheControl: '31536000' })
  if (error) throw new Error('Gagal mengunggah foto.')
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
}
