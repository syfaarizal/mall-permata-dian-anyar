import { Link } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { usePublicSettings } from '../auth/hooks'
import { useStoreStatus } from '../../lib/now'
import { buildSellerVerifyMessage, buildWaLink } from '../../lib/whatsapp'
import { Card, Notice, Spinner, Toggle } from '../../components/ui'
import { setStoreOverride } from './api'
import { keys, useMyStore, useProducts } from './hooks'
import { invalidateCatalog } from '../catalog/invalidate'
import type { Profile, Store } from '../../lib/types'

const linkBtn = 'min-h-12 rounded-xl px-4 py-3 text-center font-bold'

function ApprovalNotice({ store, profile, adminWa }: { store: Store; profile: Profile; adminWa: string | null }) {
  if (store.approval_status === 'approved') return null
  if (store.approval_status === 'rejected') return <Notice tone="bad">Toko belum disetujui admin. Hubungi admin untuk info lebih lanjut.</Notice>
  if (store.approval_status === 'suspended') return <Notice tone="bad">Toko sedang ditangguhkan admin.</Notice>
  if (profile.phone_verified_at) return <Notice>Nomormu sudah terverifikasi. Toko tampil setelah admin menyetujui.</Notice>
  const text = buildSellerVerifyMessage({ storeName: store.name, name: profile.name, block: profile.block, houseNo: profile.house_no, waNumber: profile.wa_number })
  return (
    <Card>
      <Notice tone="warn">Toko belum tampil. Penjual wajib warga perum, jadi nomormu perlu dikonfirmasi admin lewat WhatsApp.</Notice>
      {adminWa ? (
        <a className={`${linkBtn} bg-marun-700 text-emas-300`} href={buildWaLink(adminWa, text)} target="_blank" rel="noreferrer">
          Kirim konfirmasi ke admin via WhatsApp
        </a>
      ) : (
        <p className="text-sm text-tinta-lembut">Nomor admin belum diatur. Hubungi admin lewat grup perum.</p>
      )}
    </Card>
  )
}

export default function SellerHomePage() {
  const { profile } = useAuth()
  const { data: settings } = usePublicSettings()
  const { data: store, isLoading } = useMyStore(profile!.id)
  const { data: products } = useProducts(store?.id)
  const qc = useQueryClient()
  const status = useStoreStatus(store)
  const override = useMutation({
    mutationFn: (v: Store['open_override']) => setStoreOverride(store!.id, v),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.store(profile!.id) })
      await invalidateCatalog(qc)
    },
  })

  if (isLoading) return <Spinner />
  if (!store) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-marun-700">Jualan di Mall Dian Anyar</h1>
        <Card>
          <p>Kamu belum punya toko. Isi data toko, lalu admin akan memverifikasi bahwa kamu warga perum.</p>
          <Link to="/jual/toko" className={`${linkBtn} bg-marun-700 text-emas-300`}>Buka toko</Link>
        </Card>
      </div>
    )
  }

  const ready = products?.filter((p) => p.is_available).length ?? 0
  const sold = (products?.length ?? 0) - ready
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-marun-700">{store.name}</h1>
        <p className="text-sm text-tinta-lembut">{store.approval_status === 'approved' ? 'Toko tampil untuk pembeli' : 'Toko belum tampil'}</p>
      </div>
      <ApprovalNotice store={store} profile={profile!} adminWa={settings?.admin_wa_number ?? null} />
      <Card>
        <div className="flex items-center justify-between gap-3">
          <p className="font-bold">Status toko</p>
          <span className={status.kind === 'closed' ? 'font-bold text-bahaya' : 'font-bold text-ok'}>{status.label}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {([['auto', 'Otomatis'], ['open', 'Selalu buka'], ['closed', 'Tutup']] as const).map(([v, label]) => (
            <Toggle key={v} pressed={store.open_override === v} disabled={override.isPending} onClick={() => override.mutate(v)}>{label}</Toggle>
          ))}
        </div>
        <p className="text-xs text-tinta-lembut">Otomatis mengikuti jam buka di pengaturan toko. Pilih "Tutup" atau "Selalu buka" untuk menimpa sementara.</p>
      </Card>
      <Card>
        <div className="flex items-center justify-between">
          <p className="font-bold">Produk</p>
          <span className="text-sm text-tinta-lembut">{ready} ready · {sold} habis</span>
        </div>
        <Link to="/jual/produk/baru" className={`${linkBtn} bg-marun-700 text-emas-300`}>+ Tambah produk</Link>
        <Link to="/jual/produk" className={`${linkBtn} border border-garis bg-white`}>Atur ready / habis</Link>
      </Card>
      <Link to="/jual/toko" className={`${linkBtn} border border-garis bg-white`}>Pengaturan toko</Link>
    </div>
  )
}
