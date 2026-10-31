import { Navigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { Toggle } from '../../components/ui'
import AdminStoresTab from './AdminStoresTab'
import AdminUsersTab from './AdminUsersTab'
import AdminSettingsTab from './AdminSettingsTab'

const TABS = [
  { id: 'toko', label: 'Toko' },
  { id: 'pengguna', label: 'Pengguna' },
  { id: 'pengaturan', label: 'Pengaturan' },
] as const

export default function AdminPage() {
  const { profile } = useAuth()
  const [params, setParams] = useSearchParams()
  if (!profile?.is_admin) return <Navigate to="/" replace />
  const tab = TABS.find((t) => t.id === params.get('tab'))?.id ?? 'toko'
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-marun-700">Panel admin</h1>
      <div className="grid grid-cols-3 gap-2">
        {TABS.map((t) => <Toggle key={t.id} pressed={tab === t.id} onClick={() => setParams({ tab: t.id }, { replace: true })}>{t.label}</Toggle>)}
      </div>
      {tab === 'toko' && <AdminStoresTab />}
      {tab === 'pengguna' && <AdminUsersTab />}
      {tab === 'pengaturan' && <AdminSettingsTab />}
    </div>
  )
}
