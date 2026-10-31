export interface OrderRecord {
  storeId: string
  storeSlug: string
  storeName: string
  lines: { productId: string; qty: number }[]
  at: number
}

const MAX_RECORDS = 30

export function addRecord(records: OrderRecord[], rec: OrderRecord): OrderRecord[] {
  return [rec, ...records].slice(0, MAX_RECORDS)
}

/** Toko langganan: yang paling sering dipesan, lalu yang paling baru. */
export function topStores(records: OrderRecord[], limit = 4) {
  const map = new Map<string, { storeId: string; storeSlug: string; storeName: string; count: number; last: number }>()
  for (const r of records) {
    const cur = map.get(r.storeId)
    map.set(r.storeId, { storeId: r.storeId, storeSlug: r.storeSlug, storeName: r.storeName, count: (cur?.count ?? 0) + 1, last: Math.max(cur?.last ?? 0, r.at) })
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.last - a.last).slice(0, limit)
}

export const lastOrderOf = (records: OrderRecord[], storeId: string) =>
  records.filter((r) => r.storeId === storeId).sort((a, b) => b.at - a.at)[0]

export function parseHistory(raw: string | null): OrderRecord[] {
  if (!raw) return []
  try {
    const d = JSON.parse(raw)
    return Array.isArray(d)
      ? d.filter((r) => typeof r?.storeId === 'string' && typeof r?.storeSlug === 'string' && Array.isArray(r?.lines) && Number.isFinite(r?.at)).slice(0, MAX_RECORDS)
      : []
  } catch {
    return []
  }
}

const KEY = 'mda.orders.v1'
export const readHistory = (): OrderRecord[] => {
  try {
    return parseHistory(localStorage.getItem(KEY))
  } catch {
    return []
  }
}
export function recordOrder(rec: OrderRecord) {
  try {
    localStorage.setItem(KEY, JSON.stringify(addRecord(readHistory(), rec)))
  } catch {
    /* penyimpanan penuh atau diblokir: abaikan, riwayat hanya kenyamanan */
  }
}
