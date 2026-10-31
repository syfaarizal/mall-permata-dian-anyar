import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Notice, Spinner, Toggle, inputCls } from '../../components/ui'
import { formatPhoneDisplay } from '../../lib/phone'
import { buildWaLink } from '../../lib/whatsapp'
import { resetPin, setUserStatus, verifyPhone, type AdminProfile } from './api'
import { useAdminStores, useAdminUsers } from './hooks'
import { PIN_MESSAGE, friendlyError } from './logic'
import { useAuth } from '../auth/AuthContext'

type Filter = 'all' | 'seller' | 'suspended' | 'unverified'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Semua' }, { id: 'seller', label: 'Penjual' }, { id: 'unverified', label: 'Belum verifikasi' }, { id: 'suspended', label: 'Ditangguhkan' },
]
const tag = 'rounded-md bg-emas-100 px-2 py-0.5 text-xs font-semibold text-marun-900'

function UserItem({ u, isSeller, me, onDone, onError, onPin }: { u: AdminProfile; isSeller: boolean; me: string; onDone: () => void; onError: (m: string) => void; onPin: (u: AdminProfile, pin: string) => void }) {
  const opts = { onSuccess: onDone, onError: (e: Error) => onError(friendlyError(e.message)) }
  const verify = useMutation({ mutationFn: () => verifyPhone(u.id), ...opts })
  const status = useMutation({ mutationFn: (s: 'active' | 'suspended') => setUserStatus(u.id, s), ...opts })
  const pin = useMutation({ mutationFn: () => resetPin(u.id), onSuccess: (p) => onPin(u, p), onError: (e: Error) => onError(e.message) })
  const busy = verify.isPending || status.isPending || pin.isPending
  const self = u.id === me
  return (
    <Card>
      <div>
        <p className="font-bold">{u.name}</p>
        <p className="text-sm text-tinta-lembut">{formatPhoneDisplay(u.wa_number)} · Blok {u.block} No. {u.house_no}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {u.is_admin && <span className={tag}>Admin</span>}
        {isSeller && <span className={tag}>Penjual</span>}
        <span className={tag}>{u.phone_verified_at ? 'Terverifikasi' : 'Belum verifikasi'}</span>
        {u.status === 'suspended' && <span className="rounded-md bg-marun-50 px-2 py-0.5 text-xs font-bold text-bahaya">Ditangguhkan</span>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <a href={buildWaLink(u.wa_number, `Halo ${u.name}, ini admin Mall Dian Anyar.`)} target="_blank" rel="noreferrer" className="min-h-12 rounded-xl border border-garis bg-white px-3 py-3 text-center font-bold">Chat via WA</a>
        {!u.phone_verified_at && <Button disabled={busy} onClick={() => verify.mutate()}>Verifikasi</Button>}
        <Button variant="ghost" disabled={busy} onClick={() => window.confirm(`Reset PIN ${u.name}? PIN lamanya tidak berlaku lagi.`) && pin.mutate()}>Reset PIN</Button>
        {!self && (u.status === 'active'
          ? <Button variant="danger" disabled={busy} onClick={() => window.confirm(`Tangguhkan ${u.name}?`) && status.mutate('suspended')}>Tangguhkan</Button>
          : <Button disabled={busy} onClick={() => status.mutate('active')}>Aktifkan lagi</Button>)}
      </div>
    </Card>
  )
}

export default function AdminUsersTab() {
  const { profile } = useAuth()
  const users = useAdminUsers()
  const stores = useAdminStores()
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [error, setError] = useState('')
  const [reset, setReset] = useState<{ user: AdminProfile; pin: string } | null>(null)
  if (users.isLoading) return <Spinner />
  const sellerIds = new Set((stores.data ?? []).map((s) => s.owner_id))
  const term = q.trim().toLowerCase()
  const list = (users.data ?? []).filter((u) => {
    if (term && !u.name.toLowerCase().includes(term) && !u.wa_number.includes(term.replace(/\D/g, '') || '\u0000')) return false
    if (filter === 'seller') return sellerIds.has(u.id)
    if (filter === 'unverified') return !u.phone_verified_at
    if (filter === 'suspended') return u.status === 'suspended'
    return true
  })
  return (
    <div className="flex flex-col gap-3">
      <input className={inputCls} type="search" placeholder="Cari nama atau nomor" aria-label="Cari pengguna" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5">
        {FILTERS.map((f) => <Toggle key={f.id} className="flex-none" pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</Toggle>)}
      </div>
      {reset && (
        <Card>
          <Notice tone="ok">PIN sementara {reset.user.name}: <b className="text-lg tracking-widest">{reset.pin}</b>. Hanya tampil sekali. Kirim lewat WhatsApp; dia wajib menggantinya saat masuk.</Notice>
          <a href={buildWaLink(reset.user.wa_number, PIN_MESSAGE(reset.user.name, reset.pin))} target="_blank" rel="noreferrer" className="min-h-12 rounded-xl bg-marun-700 px-4 py-3 text-center font-bold text-emas-300">Kirim PIN via WhatsApp</a>
          <Button variant="ghost" onClick={() => setReset(null)}>Tutup</Button>
        </Card>
      )}
      {error && <Notice tone="bad">{error}</Notice>}
      <p className="text-sm text-tinta-lembut">{list.length} pengguna</p>
      {list.map((u) => (
        <UserItem key={u.id} u={u} isSeller={sellerIds.has(u.id)} me={profile!.id} onError={setError} onPin={(user, pin) => { setError(''); setReset({ user, pin }) }}
          onDone={() => { setError(''); void qc.invalidateQueries({ queryKey: ['admin-users'] }); void qc.invalidateQueries({ queryKey: ['admin-stores'] }) }} />
      ))}
    </div>
  )
}
