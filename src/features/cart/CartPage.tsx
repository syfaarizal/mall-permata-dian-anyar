import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { formatRupiah } from '../../lib/format'
import { formatAddress } from '../../lib/address'
import { useNow } from '../../lib/now'
import { getStoreStatus } from '../../lib/storeStatus'
import { Button, Card, Field, Notice, Spinner, Toggle, inputCls } from '../../components/ui'
import { Photo, StatusPill } from '../catalog/components'
import { useCartProducts } from '../catalog/hooks'
import type { ProductWithStore } from '../catalog/api'
import { cartActions, useCart } from './cartStore'
import { resolvePayment } from './cartLogic'

export default function CartPage() {
  const { profile } = useAuth()
  const cart = useCart()
  const navigate = useNavigate()
  const { data, isLoading } = useCartProducts(cart.lines.map((l) => l.productId))
  const now = useNow()

  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-marun-700">Keranjang</h1>
        <Notice>Keranjangmu kosong.</Notice>
        <Link to="/" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-marun-700 px-4 text-center font-bold text-emas-300">Cari makanan</Link>
      </div>
    )
  }
  if (isLoading) return <Spinner />

  const byId = new Map<string, ProductWithStore>((data ?? []).map((p) => [p.id, p]))
  const storeIds = [...new Set(cart.lines.map((l) => l.storeId))]

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-marun-700">Keranjang</h1>
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-bold">Antar ke</p>
            <p className="text-sm text-tinta-lembut">{profile ? formatAddress(profile) : ''} · a.n. {profile?.name}</p>
          </div>
          <Link to="/akun" className="min-h-11 rounded-xl border border-garis px-3 py-2.5 font-semibold">Ubah</Link>
        </div>
      </Card>

      {storeIds.map((storeId) => {
        const lines = cart.lines.filter((l) => l.storeId === storeId)
        const rows = lines.map((l) => ({ line: l, product: byId.get(l.productId) }))
        const store = rows.find((r) => r.product)?.product?.store
        const missing = rows.filter((r) => !r.product || !r.product.is_available)
        const okRows = rows.filter((r) => r.product && r.product.is_available)
        const subtotal = okRows.reduce((sum, r) => sum + r.line.qty * r.product!.price, 0)
        const status = store ? getStoreStatus(store, now) : null
        const payment = store ? resolvePayment(store, cart.meta[storeId]?.payment) : 'cash'
        const blocked = !store || !status?.canOrder || missing.length > 0 || okRows.length === 0
        const firstName = okRows[0]?.product?.name ?? missing[0]?.product?.name ?? ''

        return (
          <Card key={storeId}>
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold">{store?.name ?? 'Toko tidak tersedia'}</p>
              {store && <StatusPill store={store} className="border border-garis" />}
            </div>
            {rows.map(({ line, product }) => (
              <div key={line.productId} className="flex items-center gap-3">
                <Photo src={product?.image_url} className="size-14 flex-none rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{product?.name ?? 'Produk tidak tersedia'}</p>
                  {product && <p className="text-xs text-tinta-lembut">{formatRupiah(product.price)} / {product.unit}</p>}
                  {(!product || !product.is_available) && <p className="text-xs font-bold text-bahaya">{product ? 'Habis' : 'Sudah tidak dijual'} · hapus dulu</p>}
                </div>
                <div className="flex flex-none items-center gap-1.5">
                  <button type="button" aria-label="Kurangi" className="inline-flex size-11 items-center justify-center rounded-xl border border-garis text-xl font-bold leading-none" onClick={() => cartActions.setQty(line.productId, line.qty - 1)}>−</button>
                  <span className="w-6 shrink-0 text-center font-bold">{line.qty}</span>
                  <button type="button" aria-label="Tambah" className="inline-flex size-11 items-center justify-center rounded-xl border border-garis text-xl font-bold leading-none" onClick={() => cartActions.setQty(line.productId, line.qty + 1)}>+</button>
                </div>
              </div>
            ))}
            {store && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {store.accept_qris && store.qris_image_url && <Toggle pressed={payment === 'qris'} onClick={() => cartActions.setMeta(storeId, { payment: 'qris' })}>QRIS</Toggle>}
                  {store.accept_cash && <Toggle pressed={payment === 'cash'} onClick={() => cartActions.setMeta(storeId, { payment: 'cash' })}>Cash</Toggle>}
                </div>
                <Field label="Catatan">
                  <input className={inputCls} placeholder="Contoh: tidak pakai sambal" value={cart.meta[storeId]?.note ?? ''} onChange={(e) => cartActions.setMeta(storeId, { note: e.target.value, payment })} />
                </Field>
              </>
            )}
            {status?.kind === 'open_pickup' && <Notice tone="warn">Toko ini sedang tidak melayani antar. Pesanan ditandai ambil sendiri.</Notice>}
            {store && !status?.canOrder && (
              <Notice tone="bad">
                Toko sedang tutup. <Link to={`/?q=${encodeURIComponent(firstName)}`} className="font-bold underline">Cari pengganti yang buka</Link>
              </Notice>
            )}
            {missing.length > 0 && <Notice tone="warn">Hapus produk yang habis supaya bisa lanjut.</Notice>}
            <div className="flex items-center justify-between">
              <p className="font-bold">Subtotal</p>
              <p className="font-bold">{formatRupiah(subtotal)}</p>
            </div>
            <Button disabled={blocked} onClick={() => navigate(`/pesan/${storeId}`)}>Lanjut ke WhatsApp</Button>
            <Button variant="ghost" onClick={() => cartActions.removeStore(storeId)}>Kosongkan pesanan toko ini</Button>
          </Card>
        )
      })}
    </div>
  )
}
