import { normalizePhone } from '../../lib/phone'
import { parseRupiahInput } from '../../lib/format'
import type { Product, Store } from '../../lib/types'

export type Errors<T> = Partial<Record<keyof T, string>>

export const UNITS = ['porsi', 'pcs', 'bungkus', 'pack', 'botol', 'kg', 'ekor', 'galon', 'tabung', 'lembar']
export const DAYS = [
  { n: 1, label: 'Sen' }, { n: 2, label: 'Sel' }, { n: 3, label: 'Rab' }, { n: 4, label: 'Kam' },
  { n: 5, label: 'Jum' }, { n: 6, label: 'Sab' }, { n: 7, label: 'Min' },
]

// ---------- Toko ----------
export interface StoreFormValues {
  name: string
  description: string
  category_id: number | null
  cover_url: string | null
  wa_number: string
  block_info: string
  accept_cash: boolean
  accept_qris: boolean
  qris_image_url: string | null
  open_time: string
  close_time: string
  open_days: number[]
  delivery_enabled: boolean
  delivery_cutoff_time: string
  delivery_area_note: string
  auto_reset_stock: boolean
}

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : '')

export function storeToForm(store: Store | null, defaults: { wa: string; blockInfo: string }): StoreFormValues {
  return {
    name: store?.name ?? '',
    description: store?.description ?? '',
    category_id: store?.category_id ?? null,
    cover_url: store?.cover_url ?? null,
    wa_number: store?.wa_number ?? defaults.wa,
    block_info: store?.block_info ?? defaults.blockInfo,
    accept_cash: store?.accept_cash ?? true,
    accept_qris: store?.accept_qris ?? false,
    qris_image_url: store?.qris_image_url ?? null,
    open_time: hhmm(store?.open_time ?? null),
    close_time: hhmm(store?.close_time ?? null),
    open_days: store?.open_days ?? [1, 2, 3, 4, 5, 6, 7],
    delivery_enabled: store?.delivery_enabled ?? true,
    delivery_cutoff_time: hhmm(store?.delivery_cutoff_time ?? null),
    delivery_area_note: store?.delivery_area_note ?? '',
    auto_reset_stock: store?.auto_reset_stock ?? false,
  }
}

export function validateStore(v: StoreFormValues): Errors<StoreFormValues> {
  const e: Errors<StoreFormValues> = {}
  const name = v.name.trim()
  if (name.length < 2 || name.length > 60) e.name = 'Nama toko 2–60 huruf.'
  if (v.category_id === null) e.category_id = 'Pilih kategori utama.'
  if (!normalizePhone(v.wa_number)) e.wa_number = 'Nomor WhatsApp tidak valid.'
  if (!v.accept_cash && !v.accept_qris) e.accept_cash = 'Pilih minimal satu cara bayar.'
  if (v.accept_qris && !v.qris_image_url) e.qris_image_url = 'Upload gambar QRIS dulu.'
  if (!!v.open_time !== !!v.close_time) e.open_time = 'Isi jam buka dan jam tutup, atau kosongkan keduanya.'
  if (v.open_days.length === 0) e.open_days = 'Pilih minimal satu hari buka.'
  return e
}

export function toStorePayload(v: StoreFormValues) {
  return {
    name: v.name.trim(),
    description: v.description.trim() || null,
    category_id: v.category_id,
    cover_url: v.cover_url,
    wa_number: normalizePhone(v.wa_number)!,
    block_info: v.block_info.trim() || null,
    accept_cash: v.accept_cash,
    accept_qris: v.accept_qris,
    qris_image_url: v.accept_qris ? v.qris_image_url : null,
    open_time: v.open_time || null,
    close_time: v.close_time || null,
    open_days: [...v.open_days].sort((a, b) => a - b),
    delivery_enabled: v.delivery_enabled,
    delivery_cutoff_time: v.delivery_enabled && v.delivery_cutoff_time ? v.delivery_cutoff_time : null,
    delivery_area_note: v.delivery_enabled ? v.delivery_area_note.trim() || null : null,
    auto_reset_stock: v.auto_reset_stock,
  }
}

// ---------- Produk ----------
export interface ProductFormValues {
  image_url: string | null
  name: string
  price: string
  unit: string
  stock_mode: 'status' | 'count'
  stock_count: string
  is_available: boolean
  description: string
  category_id: number | null
}

export function productToForm(p: Product | null): ProductFormValues {
  return {
    image_url: p?.image_url ?? null,
    name: p?.name ?? '',
    price: p ? String(p.price) : '',
    unit: p?.unit ?? 'porsi',
    stock_mode: p?.stock_mode ?? 'status',
    stock_count: p?.stock_count != null ? String(p.stock_count) : '',
    is_available: p?.is_available ?? true,
    description: p?.description ?? '',
    category_id: p?.category_id ?? null,
  }
}

export function validateProduct(v: ProductFormValues): Errors<ProductFormValues> {
  const e: Errors<ProductFormValues> = {}
  const name = v.name.trim()
  if (name.length < 2 || name.length > 80) e.name = 'Nama produk 2–80 huruf.'
  const price = parseRupiahInput(v.price)
  if (price === null || price <= 0) e.price = 'Isi harga dengan angka.'
  if (v.stock_mode === 'count' && parseRupiahInput(v.stock_count) === null) e.stock_count = 'Isi jumlah stok.'
  return e
}

export function toProductPayload(v: ProductFormValues) {
  const count = v.stock_mode === 'count' ? parseRupiahInput(v.stock_count) : null
  return {
    image_url: v.image_url,
    name: v.name.trim(),
    price: parseRupiahInput(v.price)!,
    unit: v.unit,
    stock_mode: v.stock_mode,
    stock_count: count,
    is_available: v.stock_mode === 'count' ? (count ?? 0) > 0 : v.is_available,
    description: v.description.trim() || null,
    category_id: v.category_id,
  }
}
