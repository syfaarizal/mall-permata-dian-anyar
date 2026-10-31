import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Notice, Spinner, Toggle } from '../../components/ui'
import { buildWaLink } from '../../lib/whatsapp'
import { setStoreApproval, verifyPhone, type AdminStore } from './api'
import { useAdminStores } from './hooks'
import { friendlyError } from './logic'
import type { ApprovalStatus } from '../../lib/types'

const FILTERS: { id: ApprovalStatus | 'other'; label: string }[] = [
  { id: 'pending', label: 'Menunggu' },
  { id: 'approved', label: 'Disetujui' },
  { id: 'other', label: 'Ditolak / ditangguhkan' },
]

function StoreItem({ s, onDone, onError }: { s: AdminStore; onDone: () => void; onError: (m: string) => void }) {
  const verified = !!s.owner?.phone_verified_at
  const approval = useMutation({ mutationFn: (st: ApprovalStatus) => setStoreApproval(s.id, st), onSuccess: onDone, onError: (e) => onError(friendlyError(e.message)) })
  const verify = useMutation({ mutationFn: () => verifyPhone(s.owner!.id), onSuccess: onDone, onError: (e) => onError(friendlyError(e.message)) })
  const busy = approval.isPending || verify.isPending
  const chat = s.owner ? buildWaLink(s.owner.wa_number, `Halo ${s.owner.name}, ini admin Mall Dian Anyar soal toko ${s.name}.`) : null
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold">{s.name}</p>
          <p className="text-sm text-tinta-lembut">{s.owner ? `${s.owner.name} · Blok ${s.owner.block} No. ${s.owner.house_no}` : 'Pemilik tidak ditemukan'}</p>
        </div>
        <span className={`flex-none text-xs font-bold ${verified ? 'text-ok' : 'text-peringatan'}`}>{verified ? 'Nomor terverifikasi ✓' : 'Nomor belum terverifikasi'}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {chat && <a href={chat} target="_blank" rel="noreferrer" className="min-h-12 rounded-xl border border-garis bg-white px-3 py-3 text-center font-bold">Chat via WA</a>}
        {!verified && s.owner && <Button variant="ghost" disabled={busy} onClick={() => verify.mutate()}>Verifikasi nomor</Button>}
        {s.approval_status !== 'approved' && <Button disabled={busy || !verified} onClick={() => approval.mutate('approved')}>Setujui</Button>}
        {s.approval_status === 'pending' && <Button variant="danger" disabled={busy} onClick={() => approval.mutate('rejected')}>Tolak</Button>}
        {s.approval_status === 'approved' && <Button variant="danger" disabled={busy} onClick={() => window.confirm(`Tangguhkan toko ${s.name}?`) && approval.mutate('suspended')}>Tangguhkan</Button>}
      </div>
    </Card>
  )
}

export default function AdminStoresTab() {
  const { data, isLoading } = useAdminStores()
  const qc = useQueryClient()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('pending')
  const [error, setError] = useState('')
  if (isLoading) return <Spinner />
  const list = (data ?? []).filter((s) => (filter === 'other' ? s.approval_status === 'rejected' || s.approval_status === 'suspended' : s.approval_status === filter))
  const pendingCount = (data ?? []).filter((s) => s.approval_status === 'pending').length
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        {FILTERS.map((f) => <Toggle key={f.id} className="px-1 text-xs" pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.id === 'pending' ? `${f.label} (${pendingCount})` : f.label}</Toggle>)}
      </div>
      {error && <Notice tone="bad">{error}</Notice>}
      {list.length === 0 && <Notice>Tidak ada toko di daftar ini.</Notice>}
      {list.map((s) => (
        <StoreItem key={s.id} s={s} onError={setError} onDone={() => { setError(''); void qc.invalidateQueries({ queryKey: ['admin-stores'] }); void qc.invalidateQueries({ queryKey: ['stores'] }) }} />
      ))}
    </div>
  )
}
