// Tulisan tangan sementara. Nanti diganti tipe hasil generate: `supabase gen types typescript`.
export interface Profile {
  id: string
  wa_number: string
  name: string
  block: string
  house_no: string
  rt: string | null
  is_admin: boolean
  status: 'active' | 'suspended'
  phone_verified_at: string | null
  must_change_pin: boolean
}

export interface PublicSettings {
  registration_open: boolean
  block_suggestions: string[]
  admin_wa_number: string | null
}

export interface Category {
  id: number
  parent_id: number | null
  name: string
  sort_order: number
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended'

export interface Store {
  id: string
  owner_id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  cover_url: string | null
  category_id: number | null
  wa_number: string
  block_info: string | null
  accept_cash: boolean
  accept_qris: boolean
  qris_image_url: string | null
  open_time: string | null
  close_time: string | null
  open_days: number[]
  open_override: 'auto' | 'open' | 'closed'
  delivery_enabled: boolean
  delivery_cutoff_time: string | null
  delivery_area_note: string | null
  auto_reset_stock: boolean
  approval_status: ApprovalStatus
}

export interface Product {
  id: string
  store_id: string
  category_id: number | null
  name: string
  description: string | null
  price: number
  unit: string
  image_url: string | null
  stock_mode: 'status' | 'count'
  is_available: boolean
  stock_count: number | null
  is_active: boolean
  sort_order: number
}
