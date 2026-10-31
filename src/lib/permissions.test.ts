import { describe, expect, it } from 'vitest'
import { can, canResetPinOf, canSuspendUser } from './permissions'

describe('permissions', () => {
  it('semua admin boleh verifikasi dan menyetujui penjual', () => {
    for (const r of ['owner', 'community', 'operations'] as const) {
      expect(can(r, 'users.verify')).toBe(true)
      expect(can(r, 'stores.approve')).toBe(true)
    }
  })
  it('tangguhkan hanya owner dan komunitas', () => {
    expect(can('operations', 'stores.suspend')).toBe(false)
    expect(can('community', 'users.suspend')).toBe(true)
  })
  it('pengaturan sistem dan peran admin hanya owner', () => {
    expect(can('community', 'settings.system')).toBe(false)
    expect(can('community', 'admins.manage')).toBe(false)
    expect(can('owner', 'admins.manage')).toBe(true)
  })
  it('bukan admin tidak bisa apa-apa', () => {
    expect(can(null, 'users.verify')).toBe(false)
    expect(can(undefined, 'stores.approve')).toBe(false)
  })
  it('reset PIN: akun admin hanya oleh owner, owner tidak bisa di-reset', () => {
    expect(canResetPinOf('operations', null)).toBe(true)
    expect(canResetPinOf('operations', 'community')).toBe(false)
    expect(canResetPinOf('community', 'operations')).toBe(false)
    expect(canResetPinOf('owner', 'operations')).toBe(true)
    expect(canResetPinOf('owner', 'owner')).toBe(false)
  })
  it('tangguhkan pengguna: aturan sama untuk akun admin', () => {
    expect(canSuspendUser('community', null)).toBe(true)
    expect(canSuspendUser('community', 'operations')).toBe(false)
    expect(canSuspendUser('owner', 'community')).toBe(true)
    expect(canSuspendUser('owner', 'owner')).toBe(false)
    expect(canSuspendUser('operations', null)).toBe(false)
  })
})
