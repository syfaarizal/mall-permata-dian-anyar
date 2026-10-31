/** Format alamat antar warga: "Blok C3 No. 5 RT 15". */

export interface Address {
  block: string
  house_no: string
  rt?: string | null
}

/** Blok bebas teks, tapi tetap dinormalisasi: " c3 " -> "C3". */
export function normalizeBlock(input: string): string {
  return input.trim().replace(/\s+/g, ' ').toUpperCase()
}

/** RT boleh diketik "15" atau "RT 15"; disimpan konsisten sebagai "RT 15". */
export function normalizeRt(input: string): string | null {
  const s = input.trim().replace(/\s+/g, ' ')
  if (!s) return null
  const m = s.match(/^(?:rt\s*)?(\d{1,3})$/i)
  return m ? `RT ${m[1]}` : s
}

/** Satu baris alamat lengkap. RT hanya muncul kalau diisi. */
export function formatAddress(a: Address): string {
  const rt = a.rt?.trim()
  return `Blok ${a.block.trim()} No. ${a.house_no.trim()}${rt ? ` ${rt}` : ''}`
}
