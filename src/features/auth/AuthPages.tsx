import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { AuthError, login, register } from './api'
import { useAuth } from './AuthContext'
import { usePublicSettings } from './hooks'
import { BrandHeader, Button, Field, Notice, inputCls } from '../../components/ui'

function Shell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 pb-8">
      <BrandHeader />
      <main className="flex flex-col gap-4 px-5">
        <div>
          <h1 className="text-2xl font-bold text-marun-700">{title}</h1>
          <p className="text-sm text-tinta-lembut">{sub}</p>
        </div>
        {children}
      </main>
    </div>
  )
}

export function LoginPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [wa, setWa] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (session) return <Navigate to="/" replace />

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(wa, pin)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Gagal masuk. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Shell title="Masuk" sub="Pakai nomor WhatsApp dan PIN-mu.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Nomor WhatsApp"><input className={inputCls} inputMode="tel" autoComplete="tel" value={wa} onChange={(e) => setWa(e.target.value)} placeholder="0812 3456 7890" /></Field>
        <Field label="PIN (6 angka)"><input className={inputCls} type="password" inputMode="numeric" maxLength={6} autoComplete="current-password" value={pin} onChange={(e) => setPin(e.target.value)} /></Field>
        {error && <Notice tone="bad">{error}</Notice>}
        <Button type="submit" disabled={busy}>Masuk</Button>
        <p className="text-sm text-tinta-lembut">Lupa PIN? Hubungi admin lewat grup WhatsApp perum.</p>
        <Link to="/daftar" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-garis bg-white px-4 text-center font-bold">Belum punya akun? Daftar</Link>
      </form>
    </Shell>
  )
}

export function RegisterPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const { data: settings } = usePublicSettings()
  const [f, setF] = useState({ name: '', wa: '', block: '', houseNo: '', rt: '', inviteCode: '', pin: '', pin2: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (session) return <Navigate to="/" replace />
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (f.name.trim().length < 2) return setError('Isi nama lengkap.')
    if (!f.block.trim() || !f.houseNo.trim()) return setError('Isi blok dan nomor rumah.')
    if (f.pin !== f.pin2) return setError('PIN dan ulangi PIN tidak sama.')
    setBusy(true)
    try {
      await register(f)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Gagal daftar. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Shell title="Daftar warga" sub="Khusus warga perum. Nomor WhatsApp dipakai untuk masuk dan pesanan.">
      {settings && !settings.registration_open && <Notice tone="warn">Pendaftaran sedang ditutup. Hubungi admin.</Notice>}
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Nama lengkap"><input className={inputCls} autoComplete="name" value={f.name} onChange={set('name')} /></Field>
        <Field label="Nomor WhatsApp"><input className={inputCls} inputMode="tel" autoComplete="tel" value={f.wa} onChange={set('wa')} placeholder="0812 3456 7890" /></Field>
        <div className="flex gap-3">
          <div className="w-24">
            <Field label="Blok" hint="mis. C3">
              <input className={inputCls} list="saran-blok-daftar" placeholder="C3" value={f.block} onChange={set('block')} />
              <datalist id="saran-blok-daftar">
                {(settings?.block_suggestions ?? []).map((b) => <option key={b} value={b} />)}
              </datalist>
            </Field>
          </div>
          <div className="flex-1"><Field label="No. rumah"><input className={inputCls} value={f.houseNo} onChange={set('houseNo')} /></Field></div>
          <div className="w-24"><Field label="RT" hint="Opsional"><input className={inputCls} placeholder="RT 15" value={f.rt} onChange={set('rt')} /></Field></div>
        </div>
        <Field label="Kode undangan" hint="Ada di grup WhatsApp Mall Dian Anyar."><input className={inputCls} autoCapitalize="characters" value={f.inviteCode} onChange={set('inviteCode')} /></Field>
        <Field label="Buat PIN (6 angka)"><input className={inputCls} type="password" inputMode="numeric" maxLength={6} autoComplete="new-password" value={f.pin} onChange={set('pin')} /></Field>
        <Field label="Ulangi PIN"><input className={inputCls} type="password" inputMode="numeric" maxLength={6} autoComplete="new-password" value={f.pin2} onChange={set('pin2')} /></Field>
        {error && <Notice tone="bad">{error}</Notice>}
        <Button type="submit" disabled={busy || settings?.registration_open === false}>Daftar</Button>
        <Link to="/masuk" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-garis bg-white px-4 text-center font-bold">Sudah punya akun? Masuk</Link>
      </form>
    </Shell>
  )
}
