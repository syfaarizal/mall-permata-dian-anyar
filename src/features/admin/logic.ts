const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // tanpa karakter yang mirip (0/O, 1/I)

/** Kode undangan acak, mis. "MDA-K7H2QX9P". Panjang supaya tidak mudah ditebak. */
export function generateInviteCode(rand: (n: number) => number = defaultRand, length = 8): string {
  let s = ''
  for (let i = 0; i < length; i++) s += CODE_CHARS[rand(CODE_CHARS.length)]
  return `MDA-${s}`
}

function defaultRand(n: number): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] % n
}

/** "a, b  c" -> ["A","B","C"] (huruf besar, unik, terurut). */
export function parseBlocks(input: string): string[] {
  return [...new Set(input.split(/[\s,;]+/).map((b) => b.trim().toUpperCase()).filter(Boolean))].sort()
}

export interface SettingsForm {
  invite_code: string
  block_suggestions: string
  admin_wa_number: string
}

export function validateSettings(v: SettingsForm, normalize: (s: string) => string | null): Record<string, string> {
  const e: Record<string, string> = {}
  if (v.invite_code.trim().length < 6) e.invite_code = 'Kode undangan minimal 6 karakter.'
  if (v.admin_wa_number.trim() && !normalize(v.admin_wa_number)) e.admin_wa_number = 'Nomor WhatsApp admin tidak valid.'
  return e
}

const MESSAGES: [string, string][] = [
  ['OWNER_NOT_VERIFIED', 'Nomor penjual belum terverifikasi. Verifikasi dulu.'],
  ['FORBIDDEN', 'Peranmu tidak punya wewenang untuk aksi ini.'],
  ['INVALID_ROLE', 'Peran tidak valid.'],
  ['USER_NOT_FOUND', 'Pengguna tidak ditemukan.'],
  ['violates foreign key', 'Kategori ini masih dipakai toko atau produk.'],
  ['duplicate key', 'Data dengan nama itu sudah ada.'],
]
export function friendlyError(message: string): string {
  return MESSAGES.find(([k]) => message.includes(k))?.[1] ?? 'Terjadi masalah. Coba lagi.'
}

export const PIN_MESSAGE = (name: string, pin: string) =>
  `Halo ${name}, PIN sementara kamu di Mall Dian Anyar: ${pin}. Masuk dengan PIN ini, lalu kamu akan diminta membuat PIN baru.`
