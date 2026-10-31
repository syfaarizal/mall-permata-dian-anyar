import type { Store } from '../../lib/types'

export interface CartLine { productId: string; storeId: string; qty: number }
export interface StoreMeta { payment: 'qris' | 'cash'; note: string }
export interface CartState { v: 1; lines: CartLine[]; meta: Record<string, StoreMeta> }

export const MAX_QTY = 99
export const emptyCart = (): CartState => ({ v: 1, lines: [], meta: {} })

const clamp = (n: number) => Math.max(0, Math.min(MAX_QTY, Math.floor(n)))

export function addLine(s: CartState, productId: string, storeId: string, qty = 1): CartState {
  const existing = s.lines.find((l) => l.productId === productId)
  const lines = existing
    ? s.lines.map((l) => (l.productId === productId ? { ...l, qty: clamp(l.qty + qty) } : l))
    : [...s.lines, { productId, storeId, qty: clamp(qty) }]
  return { ...s, lines: lines.filter((l) => l.qty > 0) }
}

export function setQty(s: CartState, productId: string, qty: number): CartState {
  return { ...s, lines: s.lines.map((l) => (l.productId === productId ? { ...l, qty: clamp(qty) } : l)).filter((l) => l.qty > 0) }
}

export function removeStore(s: CartState, storeId: string): CartState {
  const { [storeId]: _drop, ...meta } = s.meta
  return { ...s, lines: s.lines.filter((l) => l.storeId !== storeId), meta }
}

export function setMeta(s: CartState, storeId: string, patch: Partial<StoreMeta>): CartState {
  const cur = s.meta[storeId] ?? { payment: 'cash' as const, note: '' }
  return { ...s, meta: { ...s.meta, [storeId]: { ...cur, ...patch } } }
}

export const totalItems = (s: CartState) => s.lines.reduce((n, l) => n + l.qty, 0)
export const qtyOf = (s: CartState, productId: string) => s.lines.find((l) => l.productId === productId)?.qty ?? 0

/** Baca keranjang dari penyimpanan; data rusak atau versi lama diabaikan (jadi keranjang kosong). */
export function parseCart(raw: string | null): CartState {
  if (!raw) return emptyCart()
  try {
    const d = JSON.parse(raw)
    if (d?.v !== 1 || !Array.isArray(d.lines)) return emptyCart()
    const lines: CartLine[] = d.lines
      .filter((l: CartLine) => typeof l?.productId === 'string' && typeof l?.storeId === 'string' && Number.isFinite(l?.qty) && l.qty > 0)
      .map((l: CartLine) => ({ productId: l.productId, storeId: l.storeId, qty: clamp(l.qty) }))
    const meta: Record<string, StoreMeta> = {}
    for (const [k, m] of Object.entries(d.meta ?? {})) {
      const mm = m as StoreMeta
      if (mm && (mm.payment === 'qris' || mm.payment === 'cash')) meta[k] = { payment: mm.payment, note: String(mm.note ?? '') }
    }
    return { v: 1, lines, meta }
  } catch {
    return emptyCart()
  }
}

/** Cara bayar yang dipakai: pilihan pembeli kalau didukung toko, kalau tidak, yang tersedia. */
export function resolvePayment(store: Pick<Store, 'accept_cash' | 'accept_qris' | 'qris_image_url'>, pref?: 'qris' | 'cash'): 'qris' | 'cash' {
  const qrisOk = store.accept_qris && !!store.qris_image_url
  if (pref === 'qris' && qrisOk) return 'qris'
  if (pref === 'cash' && store.accept_cash) return 'cash'
  return qrisOk ? 'qris' : 'cash'
}
