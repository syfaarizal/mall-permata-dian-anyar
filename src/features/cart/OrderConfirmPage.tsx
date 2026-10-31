import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { formatRupiah } from '../../lib/format'
import { useNow } from '../../lib/now'
import { getStoreStatus } from '../../lib/storeStatus'
import { buildWaLink, orderTotal, type OrderInput } from '../../lib/whatsapp'
import { Card, Notice, Spinner } from '../../components/ui'
import { Photo } from '../catalog/components'
import { useCartProducts } from '../catalog/hooks'
import type { ProductWithStore } from '../catalog/api'
import { cartActions, useCart } from './cartStore'
import { resolvePayment } from './cartLogic'
import { recordOrder } from './history'
import { buildCartMessage } from './message'

interface Order {
  store: ProductWithStore['store']
  rows: { product: ProductWithStore; qty: number }[]
  input: OrderInput
  message: string
  link: string
}

export default function OrderConfirmPage() {
  const { storeId = '' } = useParams()
  const { profile } = useAuth()
  const cart = useCart()
  const lines = cart.lines.filter((l) => l.storeId === storeId)
  const { data, isLoading } = useCartProducts(lines.map((l) => l.productId))
  const [frozen, setFrozen] = useState<Order | null>(null)
  const now = useNow()

  let live: Order | null = null
  if (data && profile) {
    const byId = new Map(data.map((p) => [p.id, p]))
    const rows = lines.flatMap((l) => {
      const product = byId.get(l.productId)
      return product && product.is_available ? [{ product, qty: l.qty }] : []
    })
    const store = rows[0]?.product.store
    if (store && rows.length === lines.length && getStoreStatus(store, now).canOrder) {
      const input: OrderInput = {
        items: rows.map((r) => ({ name: r.product.name, qty: r.qty, price: r.product.price })),
        note: cart.meta[storeId]?.note,
        payment: resolvePayment(store, cart.meta[storeId]?.payment),
        address: { name: profile.name, block: profile.block, house_no: profile.house_no, rt: profile.rt },
      }
      const message = buildCartMessage(input, getStoreStatus(store, now).canDeliver ? 'antar' : 'ambil')
      live = { store, rows, input, message, link: buildWaLink(store.wa_number, message) }
    }
  }

  const order = frozen ?? live
  if (!frozen && isLoading) return <Spinner />
  if (!order) return <Navigate to="/keranjang" replace />

  function markSent() {
    if (!order || frozen) return
    setFrozen(order)
    recordOrder({
      storeId,
      storeSlug: order.store.slug,
      storeName: order.store.name,
      lines: order.rows.map((r) => ({ productId: r.product.id, qty: r.qty })),
      at: Date.now(),
    })
    cartActions.removeStore(storeId)
  }

  const total = orderTotal(order.input.items)
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-marun-700">{frozen ? 'Pesanan dikirim' : 'Siap dikirim ke penjual'}</h1>
        <p className="text-sm text-tinta-lembut">{order.store.name}</p>
      </div>
      {frozen && <Notice tone="ok">Pesan sudah dibuka di WhatsApp. Pastikan kamu menekan kirim, lalu tunggu balasan penjual.</Notice>}
      <Card>
        <p className="font-bold">Ringkasan</p>
        {order.rows.map((r) => (
          <div key={r.product.id} className="flex items-center gap-3">
            <Photo src={r.product.image_url} className="size-12 flex-none rounded-lg" />
            <p className="min-w-0 flex-1 truncate">{r.product.name} x{r.qty}</p>
            <p className="font-semibold">{formatRupiah(r.product.price * r.qty)}</p>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-garis pt-2 font-bold"><span>Total</span><span>{formatRupiah(total)}</span></div>
      </Card>
      {order.input.payment === 'qris' && order.store.qris_image_url && (
        <Card>
          <p className="font-bold">Bayar dengan QRIS</p>
          <img src={order.store.qris_image_url} alt={`QRIS ${order.store.name}`} className="mx-auto size-56 rounded-lg border border-garis object-contain" />
          <p className="text-center text-lg font-bold">{formatRupiah(total)}</p>
          <p className="text-sm text-tinta-lembut">Setelah bayar, kirim bukti di chat WhatsApp yang sama.</p>
        </Card>
      )}
      <Card>
        <p className="font-bold">Pesan yang dikirim</p>
        <pre className="whitespace-pre-wrap rounded-xl border border-garis bg-krem p-3 font-mono text-sm">{order.message}</pre>
        <p className="text-xs text-tinta-lembut">Ini permintaan pesanan. Pesanan jadi setelah penjual membalas.</p>
      </Card>
      {frozen ? (
        <Link to="/" className="min-h-12 rounded-xl bg-marun-700 px-4 py-3 text-center font-bold text-emas-300">Kembali ke beranda</Link>
      ) : (
        <>
          <a href={order.link} target="_blank" rel="noreferrer" onClick={markSent} className="min-h-12 rounded-xl bg-marun-700 px-4 py-3 text-center font-bold text-emas-300">Buka WhatsApp</a>
          <Link to="/keranjang" className="min-h-12 rounded-xl border border-garis bg-white px-4 py-3 text-center font-bold">Kembali ke keranjang</Link>
        </>
      )}
    </div>
  )
}
