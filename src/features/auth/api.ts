import { supabase } from '../../lib/supabase'
import { normalizePhone, phoneToAuthEmail } from '../../lib/phone'

export class AuthError extends Error {}

export interface RegisterInput {
  name: string
  wa: string
  block: string
  houseNo: string
  inviteCode: string
  pin: string
}

function friendly(message: string): string {
  if (/already registered|already been registered/i.test(message)) return 'Nomor ini sudah terdaftar. Silakan masuk.'
  if (/invalid login/i.test(message)) return 'Nomor atau PIN salah.'
  if (/database error/i.test(message)) return 'Data pendaftaran tidak valid. Cek blok dan kode undangan.'
  return message
}

export async function register(input: RegisterInput) {
  const wa = normalizePhone(input.wa)
  if (!wa) throw new AuthError('Nomor WhatsApp tidak valid.')
  if (!/^\d{6}$/.test(input.pin)) throw new AuthError('PIN harus 6 angka.')
  const { data: ok } = await supabase.rpc('validate_invite', { p_code: input.inviteCode })
  if (!ok) throw new AuthError('Kode undangan salah atau pendaftaran ditutup.')
  const { error } = await supabase.auth.signUp({
    email: phoneToAuthEmail(wa),
    password: input.pin,
    options: {
      data: { name: input.name.trim(), wa_number: wa, block: input.block, house_no: input.houseNo.trim(), invite_code: input.inviteCode },
    },
  })
  if (error) throw new AuthError(friendly(error.message))
}

export async function login(waInput: string, pin: string) {
  const wa = normalizePhone(waInput)
  if (!wa) throw new AuthError('Nomor WhatsApp tidak valid.')
  const { error } = await supabase.auth.signInWithPassword({ email: phoneToAuthEmail(wa), password: pin })
  if (error) throw new AuthError(friendly(error.message))
}

export const logout = () => supabase.auth.signOut()
