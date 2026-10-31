import { describe, expect, it } from 'vitest'
import { storeToForm, toProductPayload, toStorePayload, validateProduct, validateStore, productToForm } from './validation'
import { makeSlug, slugify } from '../../lib/slug'
import { fitWithin } from '../../lib/image'
import { parseRupiahInput } from '../../lib/format'
import { buildSellerVerifyMessage } from '../../lib/whatsapp'

const okStore = { ...storeToForm(null, { wa: '0812 3456 7890', blockInfo: 'Blok C' }), name: 'Warung Bu Dyah', category_id: 2 }

describe('validateStore', () => {
  it('lolos untuk data minimal yang benar', () => expect(validateStore(okStore)).toEqual({}))
  it('menolak QRIS tanpa gambar', () => {
    expect(validateStore({ ...okStore, accept_qris: true }).qris_image_url).toBeTruthy()
  })
  it('menolak tanpa cara bayar', () => {
    expect(validateStore({ ...okStore, accept_cash: false, accept_qris: false }).accept_cash).toBeTruthy()
  })
  it('jam buka dan tutup harus berpasangan', () => {
    expect(validateStore({ ...okStore, open_time: '06:00' }).open_time).toBeTruthy()
    expect(validateStore({ ...okStore, open_time: '06:00', close_time: '14:00' }).open_time).toBeUndefined()
  })
})

describe('toStorePayload', () => {
  it('menormalkan nomor dan mengosongkan field kosong jadi null', () => {
    const p = toStorePayload({ ...okStore, open_days: [3, 1] })
    expect(p.wa_number).toBe('6281234567890')
    expect(p.open_time).toBeNull()
    expect(p.open_days).toEqual([1, 3])
  })
  it('mengabaikan cut-off kalau antar dimatikan', () => {
    const p = toStorePayload({ ...okStore, delivery_enabled: false, delivery_cutoff_time: '13:30', delivery_area_note: 'A-D' })
    expect(p.delivery_cutoff_time).toBeNull()
    expect(p.delivery_area_note).toBeNull()
  })
})

describe('produk', () => {
  const v = { ...productToForm(null), name: 'Nasi daun jeruk', price: '10.000' }
  it('validasi harga dan nama', () => {
    expect(validateProduct(v)).toEqual({})
    expect(validateProduct({ ...v, price: '' }).price).toBeTruthy()
    expect(validateProduct({ ...v, name: 'a' }).name).toBeTruthy()
  })
  it('mode jumlah: stok 0 berarti habis', () => {
    const p = toProductPayload({ ...v, stock_mode: 'count', stock_count: '0' })
    expect(p.is_available).toBe(false)
    expect(p.stock_count).toBe(0)
  })
  it('mode status: harga dibersihkan jadi angka', () => expect(toProductPayload(v).price).toBe(10000))
})

describe('helper', () => {
  it('slug', () => {
    expect(slugify('Warung Bu Dyah!')).toBe('warung-bu-dyah')
    expect(makeSlug('Kue Bu Ani', () => 0)).toBe('kue-bu-ani-0000')
  })
  it('fitWithin tidak memperbesar dan menjaga rasio', () => {
    expect(fitWithin(4000, 3000, 1280)).toEqual({ width: 1280, height: 960 })
    expect(fitWithin(800, 600, 1280)).toEqual({ width: 800, height: 600 })
  })
  it('parseRupiahInput', () => {
    expect(parseRupiahInput('Rp 10.000')).toBe(10000)
    expect(parseRupiahInput('')).toBeNull()
  })
  it('pesan verifikasi penjual', () => {
    expect(buildSellerVerifyMessage({ storeName: 'Warung X', name: 'Syifa', block: 'C3', house_no: '12', rt: 'RT 15', waNumber: '628123' })).toContain('Blok C3 No. 12 RT 15')
  })
})
