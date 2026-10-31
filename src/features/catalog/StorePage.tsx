import { Link, Outlet, useParams } from 'react-router'
import { formatRupiah } from '../../lib/format'
import { useStoreStatus } from '../../lib/now'
import { Notice, Spinner, cx } from '../../components/ui'
import { cartActions, useCart } from '../cart/cartStore'
import { qtyOf, totalItems } from '../cart/cartLogic'
import { Photo, StatusPill, coverOf } from './components'
import { useStoreBySlug, useStoreProducts } from './hooks'
import type { Product } from '../../lib/types'

function Stepper({ product, storeId }: { product: Product; storeId: string }) {
  const cart = useCart()
  const qty = qtyOf(cart, product.id)
  if (qty === 0) {
    return <button type="button" onClick={() => cartActions.add(product.id, storeId)} className="inline-flex min-h-11 flex-none items-center justify-center rounded-xl bg-marun-700 px-4 font-bold text-emas-300">Tambah</button>
  }
  const btn = 'inline-flex size-11 items-center justify-center rounded-xl border border-garis bg-white text-xl font-bold leading-none'
  return (
    <div className="flex flex-none items-center gap-2">
      <button type="button" aria-label="Kurangi" className={btn} onClick={() => cartActions.setQty(product.id, qty - 1)}>−</button>
      <span className="w-6 shrink-0 text-center font-bold">{qty}</span>
      <button type="button" aria-label="Tambah" className={btn} onClick={() => cartActions.setQty(product.id, qty + 1)}>+</button>
    </div>
  )
}

export default function StorePage() {
  const { slug } = useParams()
  const store = useStoreBySlug(slug)
  const products = useStoreProducts(store.data?.id)
  const cart = useCart()
  const status = useStoreStatus(store.data)
  if (store.isLoading) return <Spinner />
  if (!store.data) return <Notice tone="bad">Toko tidak ditemukan atau belum tampil.</Notice>
  const s = store.data
  const list = [...(products.data ?? [])].sort((a, b) => Number(b.is_available) - Number(a.is_available))
  const mine = cart.lines.filter((l) => l.storeId === s.id)
  const subtotal = mine.reduce((sum, l) => sum + l.qty * (products.data?.find((p) => p.id === l.productId)?.price ?? 0), 0)

  return (
    <div className="flex flex-col gap-4 pb-20">
      <div className="relative -mx-5 -mt-4">
        <Photo src={coverOf(s)} className="aspect-[16/8] w-full" />
        <StatusPill store={s} className="absolute left-5 top-3" />
      </div>
      <div>
        <h1 className="truncate text-2xl font-bold text-marun-700">{s.name}</h1>
        <p className="truncate text-sm text-tinta-lembut">{[s.block_info, s.delivery_area_note && `Antar: ${s.delivery_area_note}`].filter(Boolean).join(' · ')}</p>
        <div className="mt-2 flex gap-1.5 text-xs font-semibold">
          {s.accept_cash && <span className="rounded-md bg-emas-100 px-2 py-0.5">Cash</span>}
          {s.accept_qris && <span className="rounded-md bg-emas-100 px-2 py-0.5">QRIS</span>}
        </div>
      </div>
      {s.approval_status !== 'approved' && (
        <Notice tone="warn">
          Toko ini belum disetujui admin, jadi belum tampil buat pembeli. Kamu tetap bisa lihat dan atur produknya.
        </Notice>
      )}
      {!status.canOrder && <Notice tone="warn">Toko sedang tutup. Kamu bisa lihat menu, tapi belum bisa memesan.</Notice>}
      {status.kind === 'open_pickup' && <Notice tone="warn">Sedang tidak melayani antar. Pesanan ditandai ambil sendiri.</Notice>}
      {products.isLoading && <Spinner />}
      {products.data?.length === 0 && <Notice>Toko ini belum punya produk.</Notice>}
      <ul className="flex flex-col gap-3">
        {list.map((p) => (
          <li key={p.id} className={cx('flex items-center gap-3 rounded-2xl border border-garis bg-white p-3', !p.is_available && 'opacity-60')}>
            <Link to={`produk/${p.id}`}>
              <Photo src={p.image_url} className="size-20 flex-none rounded-xl" />
            </Link>
            <Link to={`produk/${p.id}`} className="min-w-0 flex-1">
              <p className="truncate font-bold">{p.name}</p>
              {p.description && <p className="line-clamp-2 text-xs text-tinta-lembut">{p.description}</p>}
              <p className="truncate text-sm font-bold">{formatRupiah(p.price)} / {p.unit}</p>
            </Link>
            {p.is_available ? (status.canOrder ? <Stepper product={p} storeId={s.id} /> : null) : (
              <Link to={`/?q=${encodeURIComponent(p.name)}`} className="text-xs font-bold text-marun-700 underline">Habis — cari di toko lain</Link>
            )}
          </li>
        ))}
      </ul>
      {mine.length > 0 && (
        <Link to="/keranjang" className="fixed inset-x-5 bottom-24 z-10 mx-auto inline-flex max-w-md items-center justify-center rounded-xl bg-marun-700 px-4 py-3 text-center font-bold text-emas-300 shadow-lg">
          Lihat keranjang · {totalItems({ ...cart, lines: mine })} item · {formatRupiah(subtotal)}
        </Link>
      )}
      <Outlet />
    </div>
  )
}
