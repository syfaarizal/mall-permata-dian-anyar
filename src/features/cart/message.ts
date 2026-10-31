import { buildOrderMessage, type OrderInput } from '../../lib/whatsapp'

export type Fulfillment = 'antar' | 'ambil'

/** Pesan pesanan; kalau toko sedang tidak melayani antar, baris alamat diganti "ambil sendiri". */
export function buildCartMessage(input: OrderInput, fulfillment: Fulfillment): string {
  const msg = buildOrderMessage(input)
  return fulfillment === 'antar' ? msg : msg.replace(/^Antar ke:.*$/m, `Ambil sendiri (a.n. ${input.address.name})`)
}
