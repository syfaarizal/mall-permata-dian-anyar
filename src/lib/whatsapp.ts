import { formatRupiah } from './format'

export interface OrderItem {
  name: string
  qty: number
  price: number
}

export interface OrderInput {
  items: OrderItem[]
  note?: string
  payment: 'qris' | 'cash'
  address: { name: string; block: string; houseNo: string }
}

export const orderTotal = (items: OrderItem[]) => items.reduce((sum, i) => sum + i.price * i.qty, 0)

/** Pesan terstruktur yang masuk ke WhatsApp penjual. Format dijaga konsisten supaya gampang dipindai. */
export function buildOrderMessage(o: OrderInput): string {
  const lines = ['Pesanan baru', ...o.items.map((i) => `${i.name} x${i.qty}`)]
  if (o.note?.trim()) lines.push(`Catatan: ${o.note.trim()}`)
  lines.push(
    `Total: ${formatRupiah(orderTotal(o.items))}`,
    `Bayar: ${o.payment === 'qris' ? 'QRIS' : 'Cash'}`,
    `Antar ke: Blok ${o.address.block} No. ${o.address.houseNo} (a.n. ${o.address.name})`,
  )
  return lines.join('\n')
}

export const buildWaLink = (waNumber: string, text: string) =>
  `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`

/** Pesan konfirmasi penjual ke admin (verifikasi nomor + alamat rumah). */
export function buildSellerVerifyMessage(i: { storeName: string; name: string; block: string; houseNo: string; waNumber: string }): string {
  return [
    'Mau buka toko di Mall Dian Anyar',
    `Toko: ${i.storeName}`,
    `Penjual: ${i.name}`,
    `Blok ${i.block} No. ${i.houseNo}`,
    `Nomor: ${i.waNumber}`,
  ].join('\n')
}
