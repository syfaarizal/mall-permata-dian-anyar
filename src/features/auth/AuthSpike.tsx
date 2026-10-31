import { useState } from 'react'
import { login, logout, register, AuthError } from './api'

const field = 'min-h-12 rounded-lg border border-garis bg-white px-3 text-base'
const btn = 'min-h-12 rounded-xl bg-marun-700 px-4 font-bold text-emas-300 disabled:opacity-50'

/** Halaman uji sementara (spike): membuktikan alur daftar/masuk nomor + PIN jalan di Supabase. Hapus di tahap 3. */
export default function AuthSpike() {
  const [mode, setMode] = useState<'daftar' | 'masuk'>('daftar')
  const [f, setF] = useState({ name: '', wa: '', block: 'C', houseNo: '', rt: '', inviteCode: '', pin: '' })
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })

  async function submit() {
    setBusy(true)
    setMsg(null)
    try {
      if (mode === 'daftar') await register(f)
      else await login(f.wa, f.pin)
      setMsg({ ok: true, text: mode === 'daftar' ? 'Berhasil daftar. Cek tabel profiles di Supabase.' : 'Berhasil masuk.' })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof AuthError ? e.message : String(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-garis bg-white p-4">
      <div className="flex gap-2">
        {(['daftar', 'masuk'] as const).map((m) => (
          <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)} className="min-h-11 flex-1 rounded-xl border border-garis font-semibold aria-pressed:border-emas-500 aria-pressed:bg-emas-100">
            {m === 'daftar' ? 'Daftar' : 'Masuk'}
          </button>
        ))}
      </div>
      {mode === 'daftar' && <input className={field} placeholder="Nama lengkap" value={f.name} onChange={set('name')} />}
      <input className={field} placeholder="Nomor WhatsApp" inputMode="tel" value={f.wa} onChange={set('wa')} />
      {mode === 'daftar' && (
        <>
          <div className="flex gap-2">
            <input className={`${field} w-24`} placeholder="Blok" value={f.block} onChange={set('block')} />
            <input className={`${field} flex-1`} placeholder="No. rumah" value={f.houseNo} onChange={set('houseNo')} />
            <input className={`${field} w-24`} placeholder="RT 15" value={f.rt} onChange={set('rt')} />
          </div>
          <input className={field} placeholder="Kode undangan" value={f.inviteCode} onChange={set('inviteCode')} />
        </>
      )}
      <input className={field} placeholder="PIN 6 angka" type="password" inputMode="numeric" maxLength={6} value={f.pin} onChange={set('pin')} />
      <button className={btn} disabled={busy} onClick={submit}>{mode === 'daftar' ? 'Daftar' : 'Masuk'}</button>
      <button className="min-h-11 rounded-xl border border-garis font-semibold" onClick={() => logout()}>Keluar</button>
      {msg && <p role="status" className={msg.ok ? 'text-ok' : 'text-bahaya'}>{msg.text}</p>}
    </section>
  )
}
