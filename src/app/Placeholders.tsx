import { Navigate } from 'react-router'
import { useAuth } from '../features/auth/AuthContext'
import { Card, Notice } from '../components/ui'

export function HomePage() {
  const { profile } = useAuth()
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-marun-700">Halo, {profile?.name.split(' ')[0]}</h1>
      <Card><p>Katalog pembeli (beranda, halaman toko, keranjang) dibangun di tahap 5 dan 6.</p></Card>
    </div>
  )
}

export function AdminPlaceholder() {
  const { profile } = useAuth()
  if (!profile?.is_admin) return <Navigate to="/" replace />
  return <Notice>Panel admin dibangun di tahap 7. Untuk sementara, setujui toko lewat dashboard Supabase atau fungsi admin_set_store_approval.</Notice>
}
