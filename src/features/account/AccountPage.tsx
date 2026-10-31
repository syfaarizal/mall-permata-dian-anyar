import { useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '../../lib/supabase'
import { formatPhoneDisplay } from '../../lib/phone'
import { useAuth } from '../auth/AuthContext'
import { usePublicSettings } from '../auth/hooks'
import { Button, Card, Field, Notice, inputCls } from '../../components/ui'

export default function AccountPage() {
  const { profile, refreshProfile, signOut } = useAuth()
  const { data: settings } = usePublicSettings()
  const [name, setName] = useState(profile?.name ?? '')
  const [block, setBlock] = useState(profile?.block ?? '')
  const [houseNo, setHouseNo] = useState(profile?.house_no ?? '')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  if (!profile) return null

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim().length < 2 || !block || !houseNo.trim()) return setMsg({ ok: false, text: 'Lengkapi nama, blok, dan nomor rumah.' })
    setBusy(true)
    const { error } = await supabase.from('profiles').update({ name: name.trim(), block, house_no: houseNo.trim() }).eq('id', profile!.id)
    setBusy(false)
    if (error) return setMsg({ ok: false, text: 'Gagal menyimpan. Coba lagi.' })
    await refreshProfile()
    setMsg({ ok: true, text: 'Alamat tersimpan.' })
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-marun-700">Akun</h1>
      <Card>
        <p className="font-bold">{profile.name}</p>
        <p className="text-sm text-tinta-lembut">{formatPhoneDisplay(profile.wa_number)}</p>
        {profile.is_admin && <Link to="/admin" className="font-bold text-marun-700 underline">Buka panel admin</Link>}
      </Card>
      <form onSubmit={save} className="flex flex-col gap-4">
        <Card>
          <p className="font-bold">Alamat antar</p>
          <Field label="Nama penerima"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <div className="flex gap-3">
            <div className="w-28">
              <Field label="Blok">
                <select className={inputCls} value={block} onChange={(e) => setBlock(e.target.value)}>
                  {[...new Set([profile.block, ...(settings?.valid_blocks ?? [])])].map((b) => <option key={b}>{b}</option>)}
                </select>
              </Field>
            </div>
            <div className="flex-1"><Field label="No. rumah"><input className={inputCls} value={houseNo} onChange={(e) => setHouseNo(e.target.value)} /></Field></div>
          </div>
          {msg && <Notice tone={msg.ok ? 'ok' : 'bad'}>{msg.text}</Notice>}
          <Button type="submit" disabled={busy}>Simpan alamat</Button>
        </Card>
      </form>
      <Link to="/ganti-pin" className="min-h-12 rounded-xl border border-garis bg-white px-4 py-3 text-center font-bold">Ganti PIN</Link>
      <Button variant="ghost" onClick={signOut}>Keluar</Button>
    </div>
  )
}
