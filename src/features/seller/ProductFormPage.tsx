import { useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { compressImage } from '../../lib/image'
import { formatRupiah, parseRupiahInput } from '../../lib/format'
import { Button, Field, Notice, Spinner, Toggle, inputCls } from '../../components/ui'
import { archiveProduct, saveProduct, uploadImage } from './api'
import { keys, useCategories, useMyStore, useProduct } from './hooks'
import { invalidateCatalog } from '../catalog/invalidate'
import { UNITS, productToForm, toProductPayload, validateProduct, type Errors, type ProductFormValues } from './validation'
import type { Product, Store } from '../../lib/types'

function ProductForm({ store, product, uid }: { store: Store; product: Product | null; uid: string }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const categories = useCategories()
  const fileRef = useRef<HTMLInputElement>(null)
  const [v, setV] = useState<ProductFormValues>(() => productToForm(product))
  const [errors, setErrors] = useState<Errors<ProductFormValues>>({})
  const [uploading, setUploading] = useState(false)
  const [serverError, setServerError] = useState('')
  const set = <K extends keyof ProductFormValues>(k: K, val: ProductFormValues[K]) => setV((p) => ({ ...p, [k]: val }))
  const done = async () => {
    await qc.invalidateQueries({ queryKey: keys.products(store.id) })
    await invalidateCatalog(qc)
    navigate('/jual/produk')
  }

  const save = useMutation({ mutationFn: () => saveProduct(store.id, product?.id ?? null, toProductPayload(v)), onSuccess: done, onError: (e) => setServerError(e.message) })
  const remove = useMutation({ mutationFn: () => archiveProduct(product!.id), onSuccess: done, onError: (e) => setServerError(e.message) })

  async function onPhoto(file?: File) {
    if (!file) return
    setUploading(true)
    setServerError('')
    try {
      set('image_url', await uploadImage(uid, 'products', await compressImage(file)))
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Gagal mengunggah foto.')
    } finally {
      setUploading(false)
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validateProduct(v)
    setErrors(errs)
    if (Object.keys(errs).length === 0) save.mutate()
  }

  const price = parseRupiahInput(v.price)
  return (
    <form onSubmit={submit} className="flex flex-col gap-4 pb-4">
      <h1 className="text-2xl font-bold text-marun-700">{product ? 'Ubah produk' : 'Tambah produk'}</h1>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-emas-500 bg-emas-100 text-center font-semibold text-marun-900"
      >
        {v.image_url ? <img src={v.image_url} alt="Foto produk" className="size-full object-cover" /> : <span>{uploading ? 'Mengunggah…' : 'Ketuk untuk ambil atau pilih foto'}</span>}
        {v.image_url && <span className="absolute bottom-2 right-2 rounded-lg bg-tinta/80 px-3 py-1 text-sm text-white">{uploading ? 'Mengunggah…' : 'Ganti foto'}</span>}
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
      <p className="-mt-2 text-xs text-tinta-lembut">Foto dari atas dengan cahaya terang membuat produkmu lebih menarik.</p>

      <Field label="Nama produk" error={errors.name}><input className={inputCls} value={v.name} onChange={(e) => set('name', e.target.value)} /></Field>
      <div className="flex gap-3">
        <div className="flex-1">
          <Field label="Harga (Rp)" error={errors.price} hint={price ? formatRupiah(price) : undefined}>
            <input className={inputCls} inputMode="numeric" value={v.price} onChange={(e) => set('price', e.target.value)} placeholder="10000" />
          </Field>
        </div>
        <div className="w-32">
          <Field label="Satuan"><select className={inputCls} value={v.unit} onChange={(e) => set('unit', e.target.value)}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select></Field>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">Stok</span>
        <div className="grid grid-cols-2 gap-2">
          <Toggle pressed={v.stock_mode === 'status'} onClick={() => set('stock_mode', 'status')}>Ready / habis</Toggle>
          <Toggle pressed={v.stock_mode === 'count'} onClick={() => set('stock_mode', 'count')}>Jumlah</Toggle>
        </div>
        {v.stock_mode === 'status' ? (
          <Toggle pressed={v.is_available} onClick={() => set('is_available', !v.is_available)}>{v.is_available ? 'Ready' : 'Habis'}</Toggle>
        ) : (
          <Field label="Jumlah stok" error={errors.stock_count}><input className={inputCls} inputMode="numeric" value={v.stock_count} onChange={(e) => set('stock_count', e.target.value)} /></Field>
        )}
      </div>

      <details className="rounded-2xl border border-garis bg-white p-4">
        <summary className="min-h-8 cursor-pointer font-semibold">Opsional: deskripsi dan kategori</summary>
        <div className="mt-3 flex flex-col gap-4">
          <Field label="Deskripsi"><input className={inputCls} value={v.description} onChange={(e) => set('description', e.target.value)} /></Field>
          <Field label="Kategori (kosong = ikut kategori toko)">
            <select className={inputCls} value={v.category_id ?? ''} onChange={(e) => set('category_id', e.target.value ? Number(e.target.value) : null)}>
              <option value="">Ikut kategori toko</option>
              {(categories.data ?? []).filter((c) => c.parent_id !== null).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>
      </details>

      {serverError && <Notice tone="bad">{serverError}</Notice>}
      <Button type="submit" disabled={save.isPending || uploading}>Simpan produk</Button>
      {product && (
        <Button type="button" variant="danger" disabled={remove.isPending} onClick={() => window.confirm('Hapus produk ini?') && remove.mutate()}>Hapus produk</Button>
      )}
    </form>
  )
}

export default function ProductFormPage() {
  const { id } = useParams()
  const { profile } = useAuth()
  const store = useMyStore(profile!.id)
  const product = useProduct(id)
  if (store.isLoading || (id && product.isLoading)) return <Spinner />
  if (!store.data) return <Navigate to="/jual" replace />
  if (id && !product.data) return <Notice tone="bad">Produk tidak ditemukan.</Notice>
  return <ProductForm key={id ?? 'baru'} store={store.data} product={product.data ?? null} uid={profile!.id} />
}
