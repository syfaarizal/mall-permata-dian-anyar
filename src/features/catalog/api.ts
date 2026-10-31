import { supabase } from '../../lib/supabase'
import type { Product, Store } from '../../lib/types'

export type StoreWithCover = Store & { products: Pick<Product, 'image_url' | 'is_active' | 'is_available'>[] }
export type ProductWithStore = Product & { store: Store }

function check<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message)
  return r.data as T
}

// RLS yang mengatur siapa boleh melihat apa: toko yang sudah disetujui admin (dan
// pemiliknya masih aktif), plus toko milik pengguna sendiri yang masih 'pending'.
// Karena itu tidak ada filter approval di sini — memfilter ulang justru menyembunyikan
// toko sendiri dari pemiliknya.

export async function fetchStores(): Promise<StoreWithCover[]> {
  return check(
    await supabase.from('stores').select('*, products(image_url,is_active,is_available)').order('created_at', { ascending: false }),
  ) as StoreWithCover[]
}

export async function fetchStoreBySlug(slug: string): Promise<StoreWithCover | null> {
  return check(
    await supabase.from('stores').select('*, products(image_url,is_active,is_available)').eq('slug', slug).maybeSingle(),
  ) as StoreWithCover | null
}

export async function fetchStoreProducts(storeId: string): Promise<Product[]> {
  return check(
    await supabase.from('products').select('*').eq('store_id', storeId).eq('is_active', true).order('sort_order').order('created_at', { ascending: false }),
  ) as Product[]
}

/** Detail satu produk, lengkap dengan tokonya (untuk status buka/tutup). */
export async function fetchProductWithStore(id: string): Promise<ProductWithStore | null> {
  return check(
    await supabase.from('products').select('*, store:stores(*)').eq('id', id).maybeSingle(),
  ) as ProductWithStore | null
}

export async function fetchReadyProducts(): Promise<ProductWithStore[]> {
  return check(
    await supabase
      .from('products')
      .select('*, store:stores!inner(*)')
      .eq('is_active', true)
      .eq('is_available', true)
      .order('updated_at', { ascending: false })
      .limit(30),
  ) as ProductWithStore[]
}

const escapeLike = (q: string) => q.replace(/[\\%_]/g, (m) => '\\' + m)

export async function searchProducts(q: string): Promise<ProductWithStore[]> {
  return check(
    await supabase
      .from('products')
      .select('*, store:stores!inner(*)')
      .eq('is_active', true)
      .ilike('name', `%${escapeLike(q.trim())}%`)
      .order('is_available', { ascending: false })
      .limit(40),
  ) as ProductWithStore[]
}

/** Untuk keranjang: harga dan ketersediaan selalu diambil terbaru dari server. */
export async function fetchProductsByIds(ids: string[]): Promise<ProductWithStore[]> {
  if (ids.length === 0) return []
  return check(await supabase.from('products').select('*, store:stores(*)').in('id', ids).eq('is_active', true)) as ProductWithStore[]
}
