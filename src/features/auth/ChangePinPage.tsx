import { useState } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '../../lib/supabase'
import { useAuth } from './AuthContext'
import { BrandHeader, Button, Field, Notice, inputCls } from '../../components/ui'

export default function ChangePinPage() {
  const { profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const forced = !!profile?.must_change_pin

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!/^\d{6}$/.test(pin)) return setError('PIN harus 6 angka.')
    if (pin !== pin2) return setError('PIN dan ulangi PIN tidak sama.')
    setBusy(true)
    const { error: err } = await supabase.auth.updateUser({ password: pin })
    if (err) {
      setBusy(false)
      return setError('Gagal mengganti PIN. Coba PIN lain.')
    }
    await supabase.rpc('complete_pin_change')
    await refreshProfile()
    navigate('/', { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 pb-8">
      <BrandHeader />
      <form onSubmit={submit} className="flex flex-col gap-4 px-5">
        <div>
          <h1 className="text-2xl font-bold text-marun-700">Buat PIN baru</h1>
          <p className="text-sm text-tinta-lembut">{forced ? 'PIN-mu direset admin. Buat PIN baru yang hanya kamu yang tahu.' : 'Pilih 6 angka yang mudah kamu ingat.'}</p>
        </div>
        <Field label="PIN baru (6 angka)"><input className={inputCls} type="password" inputMode="numeric" maxLength={6} autoComplete="new-password" value={pin} onChange={(e) => setPin(e.target.value)} /></Field>
        <Field label="Ulangi PIN baru"><input className={inputCls} type="password" inputMode="numeric" maxLength={6} autoComplete="new-password" value={pin2} onChange={(e) => setPin2(e.target.value)} /></Field>
        {error && <Notice tone="bad">{error}</Notice>}
        <Button type="submit" disabled={busy}>Simpan PIN</Button>
        {!forced && <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Batal</Button>}
      </form>
    </div>
  )
}
