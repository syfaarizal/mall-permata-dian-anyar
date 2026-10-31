/** Normalisasi nomor HP Indonesia ke format 628xxxxxxxx. Null kalau tidak valid. */
export function normalizePhone(input: string): string | null {
  let n = input.replace(/[^\d+]/g, '').replace(/^\+/, '')
  if (n.startsWith('0')) n = '62' + n.slice(1)
  else if (n.startsWith('8')) n = '62' + n
  return /^628\d{8,11}$/.test(n) ? n : null
}

/** Identitas login internal: nomor HP dipetakan ke email palsu (PIN jadi password). */
export function phoneToAuthEmail(wa: string): string {
  const domain = (import.meta.env.VITE_AUTH_EMAIL_DOMAIN as string | undefined) ?? 'mda-app.id'
  return `${wa}@${domain}`
}

export function formatPhoneDisplay(wa: string): string {
  const local = '0' + wa.slice(2)
  return local.replace(/^(\d{4})(\d{4})(\d+)$/, '$1 $2 $3')
}
