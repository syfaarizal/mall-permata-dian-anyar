import { Link } from 'react-router'
import { cx } from '../../components/ui'
import { formatRupiah } from '../../lib/format'
import { useStoreStatus } from '../../lib/now'
import type { Product, Store } from '../../lib/types'
import { cartActions } from '../cart/cartStore'
import type { StoreWithCover } from './api'

export function Photo({ src, className }: { src?: string | null; className?: string }) {
  return src ? (
    <img src={src} alt="" loading="lazy" className={cx('object-cover', className)} />
  ) : (
    <div aria-hidden className={cx('bg-gradient-to-br from-emas-100 to-emas-300', className)} />
  )
}

export const coverOf = (s: StoreWithCover) =>
  s.cover_url ?? s.logo_url ?? s.products?.find((p) => p.is_active && p.image_url)?.image_url ?? null

export function StatusPill({ store, className }: { store: Store; className?: string }) {
  const st = useStoreStatus(store)
  const tone = st.kind === 'closed' ? 'text-bahaya' : st.kind === 'open_pickup' ? 'text-peringatan' : 'text-ok'
  return <span className={cx('rounded-full bg-white px-3 py-1 text-xs font-bold', tone, className)}>{st.label}</span>
}

export function StoreCard({ store }: { store: StoreWithCover }) {
  return (
    <Link to={`/toko/${store.slug}`} className="overflow-hidden rounded-2xl border border-garis bg-white">
      <div className="relative">
        <Photo src={coverOf(store)} className="aspect-[16/9] w-full" />
        <StatusPill store={store} className="absolute left-2.5 top-2.5" />
      </div>
      <div className="flex flex-col gap-1.5 p-3">
        <p className="font-bold">{store.name}</p>
        {store.block_info && <p className="text-sm text-tinta-lembut">{store.block_info}</p>}
        <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
          {store.accept_cash && <span className="rounded-md bg-emas-100 px-2 py-0.5 text-marun-900">Cash</span>}
          {store.accept_qris && <span className="rounded-md bg-emas-100 px-2 py-0.5 text-marun-900">QRIS</span>}
          {store.delivery_enabled && store.delivery_area_note && <span className="rounded-md bg-emas-100 px-2 py-0.5 text-marun-900">{store.delivery_area_note}</span>}
        </div>
      </div>
    </Link>
  )
}

export function AddButton({ product, store }: { product: Product; store: Store }) {
  return (
    <button
      type="button"
      aria-label={`Tambah ${product.name} ke keranjang`}
      onClick={() => cartActions.add(product.id, store.id)}
      className="size-11 flex-none rounded-full bg-marun-700 text-2xl font-bold leading-none text-emas-300"
    >
      +
    </button>
  )
}

/** Kartu produk kecil untuk carousel "Lagi ready sekarang". */
export function ProductMiniCard({ product }: { product: Product & { store: Store } }) {
  const canOrder = useStoreStatus(product.store).canOrder
  return (
    <div className="w-40 flex-none overflow-hidden rounded-2xl border border-garis bg-white">
      <Link to={`/toko/${product.store.slug}`}>
        <Photo src={product.image_url} className="h-28 w-full" />
      </Link>
      <div className="flex flex-col gap-1 p-2.5">
        <p className="truncate font-bold">{product.name}</p>
        <p className="truncate text-xs text-tinta-lembut">{product.store.name}</p>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold">{formatRupiah(product.price)}</p>
          {canOrder && <AddButton product={product} store={product.store} />}
        </div>
      </div>
    </div>
  )
}

/** Baris hasil pencarian. */
export function ProductRow({ product }: { product: Product & { store: Store } }) {
  const status = useStoreStatus(product.store)
  const canOrder = product.is_available && status.canOrder
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-garis bg-white p-3">
      <Photo src={product.image_url} className="size-16 flex-none rounded-xl" />
      <Link to={`/toko/${product.store.slug}`} className="min-w-0 flex-1">
        <p className="truncate font-bold">{product.name}</p>
        <p className="truncate text-xs text-tinta-lembut">{product.store.name} · {status.label}</p>
        <p className="text-sm font-bold">{formatRupiah(product.price)} / {product.unit}</p>
      </Link>
      {canOrder ? <AddButton product={product} store={product.store} /> : <span className="text-xs font-bold text-bahaya">{product.is_available ? 'Tutup' : 'Habis'}</span>}
    </li>
  )
}
