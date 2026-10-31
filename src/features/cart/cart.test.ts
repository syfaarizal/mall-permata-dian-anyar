import { describe, expect, it } from 'vitest'
import { addLine, emptyCart, parseCart, qtyOf, removeStore, resolvePayment, setMeta, setQty, totalItems } from './cartLogic'
import { addRecord, lastOrderOf, parseHistory, topStores, type OrderRecord } from './history'
import { buildCartMessage } from './message'

describe('cartLogic', () => {
  it('menambah dan menggabungkan item yang sama', () => {
    let s = addLine(emptyCart(), 'p1', 's1')
    s = addLine(s, 'p1', 's1')
    s = addLine(s, 'p2', 's2')
    expect(qtyOf(s, 'p1')).toBe(2)
    expect(totalItems(s)).toBe(3)
  })
  it('qty 0 menghapus baris, dan qty dibatasi 99', () => {
    let s = addLine(emptyCart(), 'p1', 's1', 500)
    expect(qtyOf(s, 'p1')).toBe(99)
    s = setQty(s, 'p1', 0)
    expect(s.lines).toEqual([])
  })
  it('removeStore menghapus baris dan meta toko itu saja', () => {
    let s = setMeta(addLine(addLine(emptyCart(), 'p1', 's1'), 'p2', 's2'), 's1', { payment: 'qris' })
    s = removeStore(s, 's1')
    expect(s.lines.map((l) => l.storeId)).toEqual(['s2'])
    expect(s.meta.s1).toBeUndefined()
  })
  it('parseCart aman terhadap data rusak', () => {
    expect(parseCart('bukan json')).toEqual(emptyCart())
    expect(parseCart(JSON.stringify({ v: 2, lines: [] }))).toEqual(emptyCart())
    const ok = parseCart(JSON.stringify({ v: 1, lines: [{ productId: 'a', storeId: 'b', qty: 2 }, { productId: 1 }], meta: {} }))
    expect(ok.lines).toHaveLength(1)
  })
  it('resolvePayment memilih yang didukung toko', () => {
    const cashOnly = { accept_cash: true, accept_qris: false, qris_image_url: null }
    const both = { accept_cash: true, accept_qris: true, qris_image_url: 'x' }
    expect(resolvePayment(cashOnly, 'qris')).toBe('cash')
    expect(resolvePayment(both, 'cash')).toBe('cash')
    expect(resolvePayment(both)).toBe('qris')
    expect(resolvePayment({ ...both, qris_image_url: null }, 'qris')).toBe('cash')
  })
})

describe('history', () => {
  const rec = (storeId: string, at: number): OrderRecord => ({ storeId, storeSlug: storeId, storeName: storeId, lines: [{ productId: 'p', qty: 1 }], at })
  it('mengurutkan langganan berdasarkan frekuensi lalu kebaruan', () => {
    const rs = [rec('a', 1), rec('b', 5), rec('a', 3), rec('c', 9)]
    expect(topStores(rs).map((s) => s.storeId)).toEqual(['a', 'c', 'b'])
    expect(lastOrderOf(rs, 'a')?.at).toBe(3)
  })
  it('membatasi jumlah catatan dan menolak data rusak', () => {
    let rs: OrderRecord[] = []
    for (let i = 0; i < 40; i++) rs = addRecord(rs, rec('a', i))
    expect(rs).toHaveLength(30)
    expect(parseHistory('{"x":1}')).toEqual([])
    expect(parseHistory(null)).toEqual([])
  })
})

describe('buildCartMessage', () => {
  const input = { items: [{ name: 'Nasi', qty: 1, price: 10000 }], payment: 'cash' as const, address: { name: 'Syifa', block: 'C', houseNo: '12' } }
  it('antar: memakai baris alamat', () => expect(buildCartMessage(input, 'antar')).toContain('Antar ke: Blok C No. 12 (a.n. Syifa)'))
  it('ambil: mengganti baris alamat', () => {
    const m = buildCartMessage(input, 'ambil')
    expect(m).toContain('Ambil sendiri (a.n. Syifa)')
    expect(m).not.toContain('Antar ke:')
  })
})
