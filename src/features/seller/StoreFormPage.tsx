import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { compressImage } from '../../lib/image'
import { formatAddress } from '../../lib/address'
import { Button, Card, Field, Notice, Spinner, Toggle, inputCls } from '../../components/ui'
import { saveStore, uploadImage } from './api'
import { keys, useCategories, useMyStore } from './hooks'
import { DAYS, storeToForm, toStorePayload, validateStore, type Errors, type StoreFormValues } from './validation'
import type { Category, Profile, Store } from '../../lib/types'

function CategorySelect({ categories, value, onChange }: { categories: Category[]; value: number | null; onChange: (v: number | null) => void }) {
  const parents = categories.filter((c) => c.parent_id === null)
  return (
    <select className={inputCls} value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
      <option value="">Pilih kategori</option>
      {parents.map((p) => {
        const kids = categories.filter((c) => c.parent_id === p.id)
        return kids.length ? (
          <optgroup key={p.id} label={p.name}>{kids.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</optgroup>
        ) : (
          <option key={p.id} value={p.id}>{p.name}</option>
        )
      })}
    </select>
  )
}

function StoreForm({ store, profile, categories }: { store: Store | null; profile: Profile; categories: Category[] }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [v, setV] = useState<StoreFormValues>(() => storeToForm(store, { wa: profile.wa_number, blockInfo: formatAddress(profile) }))
  const [errors, setErrors] = useState<Errors<StoreFormValues>>({})
  const [uploading, setUploading] = useState(false)
  const [serverError, setServerError] = useState('')
  const set = <K extends keyof StoreFormValues>(k: K, val: StoreFormValues[K]) => setV((p) => ({ ...p, [k]: val }))

  const save = useMutation({
    mutationFn: () => saveStore(profile.id, store, toStorePayload(v)),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.store(profile.id) })
      navigate('/jual')
    },
    onError: (e) => setServerError(e.message),
  })

  async function onCover(file?: File) {
    if (!file) return
    setUploading(true)
    setServerError('')
    try {
      set('cover_url', await uploadImage(profile.id, 'cover', await compressImage(file)))
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Gagal mengunggah.')
    } finally {
      setUploading(false)
    }
  }

  async function onQris(file?: File) {
    if (!file) return
    setUploading(true)
    setServerError('')
    try {
      set('qris_image_url', await uploadImage(profile.id, 'qris', await compressImage(file, 1000)))
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Gagal mengunggah.')
    } finally {
      setUploading(false)
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validateStore(v)
    setErrors(errs)
    if (Object.keys(errs).length === 0) save.mutate()
  }

  const toggleDay = (n: number) => set('open_days', v.open_days.includes(n) ? v.open_days.filter((d) => d !== n) : [...v.open_days, n])

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 pb-4">
      <h1 className="text-2xl font-bold text-marun-700">{store ? 'Pengaturan toko' : 'Buka toko'}</h1>
      {!store && <Notice>Toko tampil setelah admin memverifikasi bahwa kamu warga perum. Sambil menunggu, kamu bisa mengisi produk.</Notice>}
      <Card>
        <p className="font-bold">Info toko</p>
        <Field label="Nama toko" error={errors.name}><input className={inputCls} value={v.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Kategori utama" error={errors.category_id}><CategorySelect categories={categories} value={v.category_id} onChange={(x) => set('category_id', x)} /></Field>
        <Field label="Deskripsi singkat (opsional)"><input className={inputCls} value={v.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <Field label="Nomor WhatsApp untuk pesanan" error={errors.wa_number}><input className={inputCls} inputMode="tel" value={v.wa_number} onChange={(e) => set('wa_number', e.target.value)} /></Field>
        <Field label="Foto sampul toko (opsional)" hint="Tampil di kartu toko di beranda. Kalau kosong, dipakai foto produk pertama.">
          <>
            {v.cover_url && <img src={v.cover_url} alt="Sampul toko" className="aspect-[16/9] w-full rounded-lg border border-garis object-cover" />}
            <input type="file" accept="image/*" disabled={uploading} onChange={(e) => onCover(e.target.files?.[0])} className="min-h-12 text-sm font-normal" />
          </>
        </Field>
        <Field label="Lokasi (blok/RT)"><input className={inputCls} value={v.block_info} onChange={(e) => set('block_info', e.target.value)} /></Field>
      </Card>
      <Card>
        <p className="font-bold">Pembayaran</p>
        <div className="grid grid-cols-2 gap-2">
          <Toggle pressed={v.accept_cash} onClick={() => set('accept_cash', !v.accept_cash)}>Cash</Toggle>
          <Toggle pressed={v.accept_qris} onClick={() => set('accept_qris', !v.accept_qris)}>QRIS</Toggle>
        </div>
        {errors.accept_cash && <p role="alert" className="text-xs font-semibold text-bahaya">{errors.accept_cash}</p>}
        {v.accept_qris && (
          <Field label="Gambar QRIS" error={errors.qris_image_url}>
            {v.qris_image_url && <img src={v.qris_image_url} alt="QRIS toko" className="size-40 self-center rounded-lg border border-garis object-contain" />}
            <input type="file" accept="image/*" disabled={uploading} onChange={(e) => onQris(e.target.files?.[0])} className="min-h-12 text-sm font-normal" />
            {uploading && <span className="text-xs font-normal text-tinta-lembut">Mengunggah…</span>}
          </Field>
        )}
      </Card>
      <Card>
        <p className="font-bold">Jam buka</p>
        <div className="flex gap-3">
          <div className="flex-1"><Field label="Buka"><input type="time" className={inputCls} value={v.open_time} onChange={(e) => set('open_time', e.target.value)} /></Field></div>
          <div className="flex-1"><Field label="Tutup"><input type="time" className={inputCls} value={v.close_time} onChange={(e) => set('close_time', e.target.value)} /></Field></div>
        </div>
        {errors.open_time && <p role="alert" className="text-xs font-semibold text-bahaya">{errors.open_time}</p>}
        <div className="grid grid-cols-7 gap-1.5">
          {DAYS.map((d) => <Toggle key={d.n} className="px-0 text-sm" pressed={v.open_days.includes(d.n)} onClick={() => toggleDay(d.n)}>{d.label}</Toggle>)}
        </div>
        {errors.open_days && <p role="alert" className="text-xs font-semibold text-bahaya">{errors.open_days}</p>}
      </Card>
      <Card>
        <div className="flex items-center justify-between gap-3">
          <p className="font-bold">Antar ke rumah</p>
          <Toggle pressed={v.delivery_enabled} onClick={() => set('delivery_enabled', !v.delivery_enabled)}>{v.delivery_enabled ? 'Aktif' : 'Mati'}</Toggle>
        </div>
        {v.delivery_enabled && (
          <>
            <Field label="Terima antar sampai jam" hint="Kosongkan kalau tidak ada batas."><input type="time" className={inputCls} value={v.delivery_cutoff_time} onChange={(e) => set('delivery_cutoff_time', e.target.value)} /></Field>
            <Field label="Catatan area antar" hint="Contoh: Blok A–D saja."><input className={inputCls} value={v.delivery_area_note} onChange={(e) => set('delivery_area_note', e.target.value)} /></Field>
          </>
        )}
      </Card>
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div><p className="font-bold">Reset stok tiap pagi</p><p className="text-xs text-tinta-lembut">Semua produk jadi "ready" lagi setiap pagi.</p></div>
          <Toggle pressed={v.auto_reset_stock} onClick={() => set('auto_reset_stock', !v.auto_reset_stock)}>{v.auto_reset_stock ? 'Aktif' : 'Mati'}</Toggle>
        </div>
      </Card>
      {serverError && <Notice tone="bad">{serverError}</Notice>}
      <Button type="submit" disabled={save.isPending || uploading}>{store ? 'Simpan pengaturan' : 'Buat toko'}</Button>
    </form>
  )
}

export default function StoreFormPage() {
  const { profile } = useAuth()
  const store = useMyStore(profile!.id)
  const categories = useCategories()
  if (store.isLoading || categories.isLoading) return <Spinner />
  return <StoreForm store={store.data ?? null} profile={profile!} categories={categories.data ?? []} />
}
