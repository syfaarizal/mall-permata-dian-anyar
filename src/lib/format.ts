export function formatRupiah(n: number): string {
  return 'Rp' + Math.round(n).toLocaleString('id-ID')
}

/** Ambil angka saja dari input harga ("10.000" -> 10000). Kosong -> null. */
export function parseRupiahInput(s: string): number | null {
  const digits = s.replace(/\D/g, '')
  return digits === '' ? null : Number(digits)
}
