import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Notice, Spinner, Toggle, inputCls } from '../../components/ui'
import { formatPhoneDisplay } from '../../lib/phone'
import { ROLE_DESC, ROLE_LABEL } from '../../lib/permissions'
import { useAuth } from '../auth/AuthContext'
import { setAdminRole } from './api'
import { useAdminUsers } from './hooks'
import { friendlyError } from './logic'

type Assignable = 'community' | 'operations'

export default function AdminTeamTab() {
  const { profile } = useAuth()
  const { data, isLoading } = useAdminUsers()
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [role, setRole] = useState<Assignable>('operations')
  const [error, setError] = useState('')
  const change = useMutation({
    mutationFn: ({ id, r }: { id: string; r: Assignable | null }) => setAdminRole(id, r),
    onSuccess: () => { setError(''); setQ(''); void qc.invalidateQueries({ queryKey: ['admin-users'] }); void qc.invalidateQueries({ queryKey: ['seller-contacts'] }) },
    onError: (e) => setError(friendlyError(e.message)),
  })
  if (isLoading) return <Spinner />
  const users = data ?? []
  const admins = users.filter((u) => u.admin_role)
  const term = q.trim().toLowerCase()
  const candidates = term.length < 2 ? [] : users.filter((u) => !u.admin_role && u.status === 'active' && (u.name.toLowerCase().includes(term) || u.wa_number.includes(term.replace(/\D/g, '') || '\u0000'))).slice(0, 5)

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="font-bold">Peran admin</p>
        {(['owner', 'community', 'operations'] as const).map((r) => (
          <p key={r} className="text-sm"><span className="font-semibold">{ROLE_LABEL[r]}:</span> <span className="text-tinta-lembut">{ROLE_DESC[r]}</span></p>
        ))}
        <p className="text-xs text-tinta-lembut">Peran Owner hanya bisa diberikan lewat SQL oleh developer.</p>
      </Card>
      {error && <Notice tone="bad">{error}</Notice>}
      <Card>
        <p className="font-bold">Tim admin ({admins.length})</p>
        {admins.map((a) => {
          const locked = a.admin_role === 'owner' || a.id === profile?.id
          return (
            <div key={a.id} className="flex flex-col gap-2 border-t border-garis pt-3 first:border-t-0 first:pt-0">
              <div>
                <p className="font-semibold">{a.name}{a.id === profile?.id && ' (kamu)'}</p>
                <p className="text-sm text-tinta-lembut">{formatPhoneDisplay(a.wa_number)} · {ROLE_LABEL[a.admin_role!]}{a.status === 'suspended' && ' · Ditangguhkan'}</p>
              </div>
              {!locked && (
                <div className="grid grid-cols-3 gap-2">
                  <Toggle pressed={a.admin_role === 'community'} disabled={change.isPending} className="px-1 text-xs" onClick={() => change.mutate({ id: a.id, r: 'community' })}>Komunitas</Toggle>
                  <Toggle pressed={a.admin_role === 'operations'} disabled={change.isPending} className="px-1 text-xs" onClick={() => change.mutate({ id: a.id, r: 'operations' })}>Operasional</Toggle>
                  <Button variant="danger" className="px-1 text-xs" disabled={change.isPending} onClick={() => window.confirm(`Cabut peran admin ${a.name}?`) && change.mutate({ id: a.id, r: null })}>Cabut</Button>
                </div>
              )}
            </div>
          )
        })}
      </Card>
      <Card>
        <p className="font-bold">Tambah admin</p>
        <input className={inputCls} type="search" placeholder="Cari nama atau nomor warga" aria-label="Cari warga" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Toggle pressed={role === 'community'} onClick={() => setRole('community')}>Komunitas</Toggle>
          <Toggle pressed={role === 'operations'} onClick={() => setRole('operations')}>Operasional</Toggle>
        </div>
        {term.length >= 2 && candidates.length === 0 && <Notice>Tidak ada warga yang cocok.</Notice>}
        {candidates.map((u) => (
          <div key={u.id} className="flex items-center justify-between gap-3">
            <p className="min-w-0 flex-1 truncate"><span className="font-semibold">{u.name}</span> <span className="text-sm text-tinta-lembut">· {formatPhoneDisplay(u.wa_number)}</span></p>
            <Button className="px-3" disabled={change.isPending} onClick={() => window.confirm(`Jadikan ${u.name} ${ROLE_LABEL[role]}?`) && change.mutate({ id: u.id, r: role })}>Jadikan</Button>
          </div>
        ))}
      </Card>
    </div>
  )
}
