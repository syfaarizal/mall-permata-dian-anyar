import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { useNow } from '../../lib/now'
import { getStoreStatus } from '../../lib/storeStatus'
import { formatRupiah } from '../../lib/format'
import { formatAddress } from '../../lib/address'
import { Button, Notice, ScrollRow, Spinner, Toggle, inputCls } from '../../components/ui'
import { cartActions } from '../cart/cartStore'
import { lastOrderOf, readHistory, topStores } from '../cart/history'
import { Photo, ProductMiniCard, ProductRow, StoreCard } from './components'
import { useCatalogCategories, useProductSearch, useReadyProducts, useStores } from './hooks'
import { useProducts } from '../seller/hooks'

export default function HomePage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const [text, setText] = useState(q)
  const [readyOnly, setReadyOnly] = useState(true)
  const [cat, setCat] = useState<number | null>(null)
  const stores = useStores()
  const ready = useReadyProducts()
  const categories = useCatalogCategories()
  const search = useProductSearch(q)
  const now = useNow()

  useEffect(() => setText(q), [q])
  useEffect(() => {
    const t = setTimeout(() => {
      if (text !== q) setParams(text.trim() ? { q: text } : {}, { replace: true })
    }, 300)
    return () => clearTimeout(t)
  }, [text, q, setParams])

  const parents = (categories.data ?? []).filter((c) => c.parent_id === null)
  const parentOf = useMemo(() => new Map((categories.data ?? []).map((c) => [c.id, c.parent_id ?? c.id])), [categories.data])
  const inCat = (categoryId: number | null) => cat === null || (categoryId !== null && parentOf.get(categoryId) === cat)

  // Toko milik sendiri: tetap tampil walau belum disetujui admin, supaya penjual
  // bisa memantau produknya sendiri.
  const myStore = useMemo(() => (stores.data ?? []).find((s) => s.owner_id === profile?.id) ?? null, [stores.data, profile?.id])
  const myStoreId = myStore?.id ?? null
  const myPending = myStore !== null && myStore.approval_status !== 'approved'
  const myProducts = useProducts(myStoreId ?? undefined)

  // Toko sendiri yang sudah disetujui tetap masuk daftar toko (pembeli lain juga lihat),
  // jadi section "Tokomu" khusus untuk yang masih pending.
  const visibleStores = (stores.data ?? []).filter(
    (s) => inCat(s.category_id) && (!myPending || s.id !== myStoreId) && (!readyOnly || getStoreStatus(s, now).canOrder),
  )
  // Katalog pembeli: produk toko orang lain yang sedang buka. Produk toko sendiri yang
  // sudah disetujui ikut, karena pembeli lain juga lihat. Kalau tokomu masih pending,
  // produknya sudah ditampilkan di section "Tokomu" supaya tidak dobel.
  const visibleReady = (ready.data ?? []).filter(
    (p) => inCat(p.category_id ?? p.store.category_id) && getStoreStatus(p.store, now).canOrder && !(myPending && p.store.owner_id === profile?.id),
  )

  const history = useMemo(() => readHistory(), [])
  const regulars = topStores(history).filter((r) => stores.data?.some((s) => s.id === r.storeId))

  function reorder(storeId: string, slug: string) {
    const last = lastOrderOf(history, storeId)
    if (last) {
      cartActions.addMany(storeId, last.lines)
      navigate('/keranjang')
    } else navigate(`/toko/${slug}`)
  }

  const searching = q.trim().length >= 2
  return (
    <div className="flex flex-col gap-4">
      <Link to="/akun" className="text-sm text-tinta-lembut">
        Diantar ke <span className="font-bold text-tinta">{profile ? formatAddress(profile) : '—'} ▾</span>
      </Link>
      <input className={inputCls} type="search" placeholder="Cari nasi, galon, gas…" aria-label="Cari produk" value={text} onChange={(e) => setText(e.target.value)} />

      {searching ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Hasil untuk "{q}"</h2>
          {search.isLoading && <Spinner />}
          {search.data?.length === 0 && <Notice>Belum ada produk "{q}". Coba kata lain.</Notice>}
          <ul className="flex flex-col gap-3">{search.data?.map((p) => <ProductRow key={p.id} product={p} />)}</ul>
        </section>
      ) : (
        <>
          <ScrollRow gap="gap-2">
            <Toggle className="flex-none" pressed={readyOnly} onClick={() => setReadyOnly(!readyOnly)}>Ready sekarang</Toggle>
            <Toggle className="flex-none" pressed={cat === null} onClick={() => setCat(null)}>Semua</Toggle>
            {parents.map((c) => <Toggle key={c.id} className="flex-none" pressed={cat === c.id} onClick={() => setCat(cat === c.id ? null : c.id)}>{c.name}</Toggle>)}
          </ScrollRow>

          {(stores.isLoading || ready.isLoading) && <Spinner />}

          {myPending && myStore && (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-bold">Tokomu</h2>
              <Notice tone="warn">
                Tokomu belum disetujui admin, jadi belum tampil buat pembeli. Produkmu tetap kelihatan di sini.
              </Notice>
              <StoreCard store={myStore} />
              {(myProducts.data ?? []).length > 0 && (
                <ul className="flex flex-col gap-3">
                  {myProducts.data!.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-garis bg-white p-3">
                      <Photo src={p.image_url} className="size-16 flex-none rounded-xl" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{p.name}</p>
                        <p className="text-sm font-bold">{formatRupiah(p.price)} / {p.unit}</p>
                      </div>
                      <span className="text-xs font-bold text-tinta-lembut">{p.is_available ? 'Ready' : 'Habis'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {visibleReady.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-bold">Lagi ready sekarang</h2>
              <ScrollRow gap="gap-3">{visibleReady.map((p) => <ProductMiniCard key={p.id} product={p} />)}</ScrollRow>
            </section>
          )}

          {regulars.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-bold">Langgananmu</h2>
              {regulars.map((r) => (
                <div key={r.storeId} className="flex items-center justify-between gap-3 rounded-2xl border border-garis bg-white p-3">
                  <Link to={`/toko/${r.storeSlug}`} className="min-w-0 flex-1 truncate font-bold">{r.storeName}</Link>
                  <Button className="px-4" onClick={() => reorder(r.storeId, r.storeSlug)}>Pesan lagi</Button>
                </div>
              ))}
            </section>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-bold">{readyOnly ? 'Buka sekarang' : 'Semua toko'}</h2>
            {stores.data?.length === 0 && <Notice>Belum ada toko yang tampil. Jadi yang pertama: buka toko di menu Jual.</Notice>}
            {stores.data && stores.data.length > 0 && visibleStores.length === 0 && (
              <Notice>
                {readyOnly ? 'Belum ada toko yang buka untuk pilihan ini.' : 'Belum ada toko di kategori ini.'}{' '}
                {readyOnly && <button className="font-bold underline" onClick={() => setReadyOnly(false)}>Tampilkan semua toko</button>}
              </Notice>
            )}
            {visibleStores.map((s) => <StoreCard key={s.id} store={s} />)}
          </section>
        </>
      )}
    </div>
  )
}
