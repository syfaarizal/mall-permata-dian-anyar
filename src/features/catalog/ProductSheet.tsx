import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { formatRupiah } from '../../lib/format'
import { useStoreStatus } from '../../lib/now'
import { Notice, Spinner } from '../../components/ui'
import { cartActions, useCart } from '../cart/cartStore'
import { qtyOf } from '../cart/cartLogic'
import { MinusIcon, PlusIcon } from '../../components/icons'
import { Photo, StatusPill } from './components'
import { useProductDetail } from './hooks'

/** Jarak geser ke bawah yang sudah dianggap "tutup". */
const CLOSE_THRESHOLD = 120

/**
 * Detail produk ala GoFood: muncul dari bawah, cuma 90% tinggi sehingga
 * sisanya halaman di belakang tetap kelihatan, dan bisa digeser ke bawah
 * untuk nutup.
 */
export default function ProductSheet() {
  const { id } = useParams()
  const navigate = useNavigate()
  const product = useProductDetail(id)
  const cart = useCart()
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startY = useRef(0)
  const scroller = useRef<HTMLDivElement>(null)

  const close = useCallback(() => {
    const idx = window.history.state?.idx
    if (typeof idx === 'number' && idx > 0) navigate(-1)
    else navigate('/', { replace: true })
  }, [navigate])

  // Halaman di belakang tidak boleh ikut tergulir selama sheet terbuka.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  // Geser ke bawah buat nutup. Tombol dan tautan dikecualikan supaya tetap bisa
  // diklik, dan konten yang sedang menggulir ke atas tidak ikut bergerak.
  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement
    if (target.closest('button, a, input, textarea, select')) return
    if (scroller.current && scroller.current.scrollTop > 0) return
    startY.current = e.clientY
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return
    setDragY(Math.max(0, e.clientY - startY.current))
  }
  function onPointerUp() {
    const shouldClose = dragY > CLOSE_THRESHOLD
    setDragging(false)
    setDragY(0)
    if (shouldClose) close()
  }

  const p = product.data
  const status = useStoreStatus(p?.store)
  const qty = p ? qtyOf(cart, p.id) : 0
  const canOrder = !!p && p.is_available && status.canOrder

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Detail produk">
      <div className="absolute inset-0 bg-marun-900/40" onClick={close} />
      <div
        className="absolute inset-x-0 bottom-0 mx-auto flex max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl"
        style={{
          height: '90dvh',
          transform: `translateY(${dragY}px)`,
          transition: dragging ? 'none' : 'transform 200ms ease-out',
          animation: 'sheet-up 240ms ease-out',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="shrink-0 cursor-grab touch-none px-5 pb-2 pt-3 active:cursor-grabbing">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-garis" />
          {p && (
            <div className="mt-3 flex items-center justify-between gap-3">
              <Link to={`/toko/${p.store.slug}`} className="min-w-0 truncate font-bold text-marun-700">
                {p.store.name}
              </Link>
              <StatusPill store={p.store} />
            </div>
          )}
        </div>

        <div ref={scroller} className="no-scrollbar flex-1 overflow-y-auto px-5 pb-4">
          {product.isLoading && <Spinner />}
          {!product.isLoading && !p && <Notice tone="bad">Produk tidak ditemukan atau sudah dihapus.</Notice>}
          {p && (
            <div className="flex flex-col gap-3">
              <Photo src={p.image_url} className="aspect-square w-full rounded-2xl" />
              <div>
                <h2 className="text-xl font-bold">{p.name}</h2>
                <p className="text-lg font-bold text-marun-700">
                  {formatRupiah(p.price)} <span className="text-sm font-semibold text-tinta-lembut">/ {p.unit}</span>
                </p>
              </div>
              {p.description
                ? <p className="whitespace-pre-line text-sm leading-relaxed text-tinta-lembut">{p.description}</p>
                : <p className="text-sm italic text-tinta-lembut">Penjual belum menulis deskripsi produk ini.</p>}
              {!p.is_available && <Notice tone="warn">Stok produk ini habis.</Notice>}
              {p.is_available && !status.canOrder && <Notice tone="warn">Toko sedang tutup, belum bisa dipesan.</Notice>}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-garis px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {p && canOrder && (
            qty === 0 ? (
              <button
                type="button"
                onClick={() => cartActions.add(p.id, p.store.id)}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-marun-700 text-base font-bold text-emas-300"
              >
                Tambah
              </button>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Kurangi"
                    onClick={() => cartActions.setQty(p.id, qty - 1)}
                    className="inline-flex size-12 items-center justify-center rounded-xl border border-garis bg-white text-tinta"
                  >
                    <MinusIcon className="size-5" />
                  </button>
                  <span className="w-8 shrink-0 text-center text-lg font-bold">{qty}</span>
                  <button
                    type="button"
                    aria-label="Tambah"
                    onClick={() => cartActions.setQty(p.id, qty + 1)}
                    className="inline-flex size-12 items-center justify-center rounded-xl border border-garis bg-white text-tinta"
                  >
                    <PlusIcon className="size-5" />
                  </button>
                </div>
                <Link to="/keranjang" className="inline-flex items-center justify-center rounded-xl bg-marun-700 px-4 py-3 font-bold text-emas-300">
                  Lihat keranjang
                </Link>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
