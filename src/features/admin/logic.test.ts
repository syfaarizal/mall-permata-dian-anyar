import { describe, expect, it } from 'vitest'
import { friendlyError, generateInviteCode, parseBlocks, validateSettings } from './logic'
import { normalizePhone } from '../../lib/phone'

describe('admin logic', () => {
  it('kode undangan: berawalan MDA-, panjang, dan tanpa karakter ambigu', () => {
    for (let i = 0; i < 50; i++) expect(generateInviteCode()).toMatch(/^MDA-[A-HJ-NP-Z2-9]{8}$/)
    expect(generateInviteCode(() => 0)).toBe('MDA-AAAAAAAA')
  })
  it('parseBlocks merapikan input', () => {
    expect(parseBlocks('b, a  c;a')).toEqual(['A', 'B', 'C'])
    expect(parseBlocks('  ')).toEqual([])
  })
  it('validateSettings', () => {
    const ok = { invite_code: 'MDA-ABCDEFGH', valid_blocks: 'A,B', admin_wa_number: '0812 3456 7890' }
    expect(validateSettings(ok, normalizePhone)).toEqual({})
    expect(validateSettings({ ...ok, invite_code: 'abc' }, normalizePhone).invite_code).toBeTruthy()
    expect(validateSettings({ ...ok, valid_blocks: '' }, normalizePhone).valid_blocks).toBeTruthy()
    expect(validateSettings({ ...ok, admin_wa_number: '123' }, normalizePhone).admin_wa_number).toBeTruthy()
    expect(validateSettings({ ...ok, admin_wa_number: '' }, normalizePhone)).toEqual({})
  })
  it('friendlyError memetakan kode server', () => {
    expect(friendlyError('OWNER_NOT_VERIFIED')).toContain('belum terverifikasi')
    expect(friendlyError('aneh')).toBe('Terjadi masalah. Coba lagi.')
  })
})
