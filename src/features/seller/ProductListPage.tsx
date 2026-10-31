import { useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { formatRupiah } from '../../lib/format'
import { Notice, Spinner, Toggle, inputCls } from '../../components/ui'
import { setProductAvailable } from './api'
import { keys, useMyStore, useProducts } from './hooks'
import { invalidateCatalog } from '../catalog/invalidate'
import type { Product } from '../../lib/types'

export default function ProductListPage() {
  const { profile } = useAuth()
  const { data: store, isLoading } = useMyStore(profile!.id)
  const { data: products } = useProducts(store?.id)
  const [q, setQ] = useState('')
  const qc = useQueryClient()
  const key = keys.products(store?.id ?? '')

  const toggle = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) => setProductAvailable(id, value),
    onMutate: async ({ id, value }) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<Product[]>(key)
      qc.setQueryData<Product[]>(key, (old) => old?.map((p) => (p.id === id ? { ...p, is_available: value } : p)))
      return { prev }
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.prev),
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: key })
      await invalidateCatalog(qc)
    },
  })

  if (isLoading) return <Spinner />
  if (!store) return <Notice>Buat toko dulu di menu Jual.</Notice>
  const shown = (products ?? []).filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-bold text-marun-700">Produk saya</h1>
      <input className={inputCls} placeholder="Cari produk" aria-label="Cari produk" value={q} onChange={(e) => setQ(e.target.value)} />
      {shown.length === 0 && <Notice>{products?.length ? 'Tidak ada produk yang cocok.' : 'Belum ada produk. Tambah produk pertamamu.'}</Notice>}
      <ul className="flex flex-col gap-3">
        {shown.map((p) => (
          <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-garis bg-white p-3">
            {p.image_url ? (
              <img src={p.image_url} alt="" className="size-16 flex-none rounded-xl object-cover" loading="lazy" />
            ) : (
              <div className="size-16 flex-none rounded-xl bg-emas-100" aria-hidden />
            )}
            <Link to={`/jual/produk/${p.id}`} className="min-w-0 flex-1">
              <p className="truncate font-bold">{p.name}</p>
              <p className="text-sm text-tinta-lembut">{formatRupiah(p.price)} / {p.unit}</p>
            </Link>
            {p.stock_mode === 'count' ? (
              <span className="text-sm font-semibold">Stok {p.stock_count ?? 0}</span>
            ) : (
              <Toggle pressed={p.is_available} onClick={() => toggle.mutate({ id: p.id, value: !p.is_available })}>
                {p.is_available ? 'Ready' : 'Habis'}
              </Toggle>
            )}
          </li>
        ))}
      </ul>
      <Link to="/jual/produk/baru" className="sticky bottom-24 inline-flex min-h-12 items-center justify-center rounded-xl bg-marun-700 px-4 text-center font-bold text-emas-300">+ Tambah produk</Link>
    </div>
  )
}
