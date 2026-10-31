import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './AuthContext'
import { BrandHeader, Button, Notice, Spinner } from '../../components/ui'

export default function RequireAuth() {
  const { session, profile, loading, signOut } = useAuth()
  const { pathname } = useLocation()
  if (loading) return <Spinner />
  if (!session) return <Navigate to="/masuk" replace />
  if (!profile) return <Spinner />
  if (profile.status === 'suspended') {
    return (
      <div className="flex flex-col gap-4">
        <BrandHeader />
        <div className="flex flex-col gap-3 px-5">
          <Notice tone="bad">Akunmu sedang ditangguhkan. Hubungi admin lewat grup WhatsApp perum.</Notice>
          <Button variant="ghost" onClick={signOut}>Keluar</Button>
        </div>
      </div>
    )
  }
  if (profile.must_change_pin && pathname !== '/ganti-pin') return <Navigate to="/ganti-pin" replace />
  return <Outlet />
}
