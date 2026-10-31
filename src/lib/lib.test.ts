import { describe, expect, it } from 'vitest'
import { normalizePhone } from './phone'
import { formatRupiah } from './format'
import { getStoreStatus, type StoreSchedule } from './storeStatus'
import { buildOrderMessage, buildWaLink } from './whatsapp'

describe('normalizePhone', () => {
  it('mengubah 08xx dan +62 ke 628xx', () => {
    expect(normalizePhone('0812-3456-7890')).toBe('6281234567890')
    expect(normalizePhone('+62 812 3456 7890')).toBe('6281234567890')
    expect(normalizePhone('81234567890')).toBe('6281234567890')
  })
  it('menolak nomor yang tidak valid', () => {
    expect(normalizePhone('12345')).toBeNull()
    expect(normalizePhone('021-555-1234')).toBeNull()
  })
})

describe('formatRupiah', () => {
  it('memakai pemisah titik', () => expect(formatRupiah(25000)).toBe('Rp25.000'))
})

const base: StoreSchedule = {
  open_time: '06:00:00',
  close_time: '14:00:00',
  open_days: [1, 2, 3, 4, 5, 6, 7],
  open_override: 'auto',
  delivery_enabled: true,
  delivery_cutoff_time: '13:30:00',
}
// 2026-10-29 adalah hari Kamis. WIB = UTC+7.
const wib = (hhmm: string, day = '2026-10-29') => new Date(`${day}T${hhmm}:00+07:00`)

describe('getStoreStatus', () => {
  it('buka dan bisa diantar sebelum cut-off', () => {
    const s = getStoreStatus(base, wib('10:00'))
    expect(s.kind).toBe('open_delivery')
    expect(s.label).toBe('Buka · antar sampai 13.30')
  })
  it('buka tapi ambil sendiri setelah cut-off', () => {
    expect(getStoreStatus(base, wib('13:45')).kind).toBe('open_pickup')
  })
  it('tutup setelah jam tutup', () => expect(getStoreStatus(base, wib('15:00')).kind).toBe('closed'))
  it('tutup sebelum buka dan menyebut jam buka', () => {
    const s = getStoreStatus(base, wib('05:00'))
    expect(s.kind).toBe('closed')
    expect(s.label).toBe('Tutup · buka 06.00')
  })
  it('override manual menang atas jadwal', () => {
    expect(getStoreStatus({ ...base, open_override: 'closed' }, wib('10:00')).kind).toBe('closed')
    expect(getStoreStatus({ ...base, open_override: 'open' }, wib('20:00')).kind).toBe('open_pickup')
  })
  it('tutup di hari yang tidak dijadwalkan', () => {
    expect(getStoreStatus({ ...base, open_days: [1, 2, 3] }, wib('10:00')).kind).toBe('closed')
  })
  it('mendukung jam buka melewati tengah malam', () => {
    const night = { ...base, open_time: '18:00:00', close_time: '02:00:00', delivery_cutoff_time: null }
    expect(getStoreStatus(night, wib('23:00')).kind).toBe('open_delivery')
    expect(getStoreStatus(night, wib('01:00')).kind).toBe('open_delivery')
    expect(getStoreStatus(night, wib('12:00')).kind).toBe('closed')
  })
  it('batas antar tengah malam berarti akhir hari, bukan sudah lewat', () => {
    // Tutup jam 00.00 dan antar sampai 00.00: toko tutup tepat tengah malam dan
    // antar tetap bisa sampai jam itu (bukan langsung "ambil sendiri saja").
    const midnight = { ...base, open_time: '06:00:00', close_time: '00:00:00', delivery_cutoff_time: '00:00:00' }
    expect(getStoreStatus(midnight, wib('10:00')).kind).toBe('open_delivery')
    expect(getStoreStatus(midnight, wib('23:00')).kind).toBe('open_delivery')
    expect(getStoreStatus(midnight, wib('23:00')).label).toBe('Buka · antar sampai 00.00')
  })
  it('batas antar di tengah malam tetap berlaku untuk toko yang buka sampai tengah malam', () => {
    const night = { ...base, open_time: '18:00:00', close_time: '02:00:00', delivery_cutoff_time: '01:00:00' }
    expect(getStoreStatus(night, wib('23:00')).kind).toBe('open_delivery')
    expect(getStoreStatus(night, wib('00:30')).kind).toBe('open_delivery')
    expect(getStoreStatus(night, wib('01:30')).kind).toBe('open_pickup')
  })
  it('tidak ada batas antar berarti selalu bisa diantar', () => {
    const noCutoff = { ...base, close_time: '23:00:00', delivery_cutoff_time: null }
    expect(getStoreStatus(noCutoff, wib('22:00')).kind).toBe('open_delivery')
    expect(getStoreStatus(noCutoff, wib('22:00')).label).toBe('Buka · bisa diantar')
  })
})

describe('buildOrderMessage', () => {
  const msg = buildOrderMessage({
    items: [
      { name: 'Nasi daun jeruk', qty: 2, price: 10000 },
      { name: 'Es lumut creamy', qty: 1, price: 5000 },
    ],
    note: 'tidak pakai sambal',
    payment: 'qris',
    address: { name: 'Syifa', block: 'C', houseNo: '12' },
  })
  it('berformat konsisten', () => {
    expect(msg).toBe(
      [
        'Pesanan baru',
        'Nasi daun jeruk x2',
        'Es lumut creamy x1',
        'Catatan: tidak pakai sambal',
        'Total: Rp25.000',
        'Bayar: QRIS',
        'Antar ke: Blok C No. 12 (a.n. Syifa)',
      ].join('\n'),
    )
  })
  it('membuat link wa.me yang ter-encode', () => {
    expect(buildWaLink('6281234567890', 'a b')).toBe('https://wa.me/6281234567890?text=a%20b')
  })
})
