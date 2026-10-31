import { Navigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { Toggle } from '../../components/ui'
import { can, ROLE_LABEL } from '../../lib/permissions'
import AdminStoresTab from './AdminStoresTab'
import AdminUsersTab from './AdminUsersTab'
import AdminSettingsTab from './AdminSettingsTab'
import AdminTeamTab from './AdminTeamTab'

type TabId = 'toko' | 'pengguna' | 'pengaturan' | 'tim'

export default function AdminPage() {
  const { profile } = useAuth()
  const [params, setParams] = useSearchParams()
  const role = profile?.admin_role
  if (!profile?.is_admin || !role) return <Navigate to="/" replace />

  const tabs: { id: TabId; label: string }[] = [
    { id: 'toko', label: 'Toko' },
    { id: 'pengguna', label: 'Pengguna' },
    ...(can(role, 'settings.community') ? [{ id: 'pengaturan' as const, label: 'Pengaturan' }] : []),
    ...(can(role, 'admins.manage') ? [{ id: 'tim' as const, label: 'Tim' }] : []),
  ]
  const tab = tabs.find((t) => t.id === params.get('tab'))?.id ?? 'toko'
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-marun-700">Panel admin</h1>
        <p className="text-sm text-tinta-lembut">{ROLE_LABEL[role]}</p>
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((t) => <Toggle key={t.id} className="px-1 text-sm" pressed={tab === t.id} onClick={() => setParams({ tab: t.id }, { replace: true })}>{t.label}</Toggle>)}
      </div>
      {tab === 'toko' && <AdminStoresTab />}
      {tab === 'pengguna' && <AdminUsersTab />}
      {tab === 'pengaturan' && <AdminSettingsTab />}
      {tab === 'tim' && <AdminTeamTab />}
    </div>
  )
}
