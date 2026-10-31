import { formatRupiah } from './format'
import { formatAddress } from './address'

export interface OrderItem {
  name: string
  qty: number
  price: number
}

export interface OrderInput {
  items: OrderItem[]
  note?: string
  payment: 'qris' | 'cash'
  address: { name: string; block: string; house_no: string; rt?: string | null }
}

export const orderTotal = (items: OrderItem[]) => items.reduce((sum, i) => sum + i.price * i.qty, 0)

/** Pesan terstruktur yang masuk ke WhatsApp penjual. Format dijaga konsisten supaya gampang dipindai. */
export function buildOrderMessage(o: OrderInput): string {
  const lines = ['Pesanan baru', ...o.items.map((i) => `${i.name} x${i.qty}`)]
  if (o.note?.trim()) lines.push(`Catatan: ${o.note.trim()}`)
  lines.push(
    `Total: ${formatRupiah(orderTotal(o.items))}`,
    `Bayar: ${o.payment === 'qris' ? 'QRIS' : 'Cash'}`,
    `Antar ke: ${formatAddress(o.address)} (a.n. ${o.address.name})`,
  )
  return lines.join('\n')
}

export const buildWaLink = (waNumber: string, text: string) =>
  `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`

/** Pesan konfirmasi penjual ke admin (verifikasi nomor + alamat rumah). */
export function buildSellerVerifyMessage(i: { storeName: string; name: string; block: string; house_no: string; rt?: string | null; waNumber: string }): string {
  return [
    'Mau buka toko di Mall Dian Anyar',
    `Toko: ${i.storeName}`,
    `Penjual: ${i.name}`,
    formatAddress(i),
    `Nomor: ${i.waNumber}`,
  ].join('\n')
}
