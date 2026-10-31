import { describe, expect, it } from 'vitest'
import { formatAddress, normalizeBlock, normalizeRt } from './address'

describe('normalizeBlock', () => {
  it('merapikan spasi dan menjadi huruf besar', () => {
    expect(normalizeBlock('  c3 ')).toBe('C3')
    expect(normalizeBlock('np 4')).toBe('NP 4')
    expect(normalizeBlock('')).toBe('')
  })
})

describe('normalizeRt', () => {
  it('menyeragamkan bentuk RT', () => {
    expect(normalizeRt('15')).toBe('RT 15')
    expect(normalizeRt('rt 15')).toBe('RT 15')
    expect(normalizeRt('RT15')).toBe('RT 15')
  })
  it('kosong jadi null', () => {
    expect(normalizeRt('')).toBeNull()
    expect(normalizeRt('   ')).toBeNull()
  })
})

describe('formatAddress', () => {
  it('menampilkan blok, nomor, dan RT', () => {
    expect(formatAddress({ block: 'C3', house_no: '5', rt: 'RT 15' })).toBe('Blok C3 No. 5 RT 15')
  })
  it('RT kosong tidak menambah apa-apa', () => {
    expect(formatAddress({ block: 'NP4', house_no: '9', rt: null })).toBe('Blok NP4 No. 9')
    expect(formatAddress({ block: 'NP4', house_no: '9' })).toBe('Blok NP4 No. 9')
  })
})
