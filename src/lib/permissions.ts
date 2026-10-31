import type { AdminRole } from './types'

/**
 * Matriks wewenang admin. Ini hanya untuk menampilkan/menyembunyikan tombol di UI.
 * Penegak sebenarnya ada di database (supabase/migrations/0006_admin_roles.sql) dan Edge Function.
 * Kalau mengubah salah satu, ubah keduanya.
 */
export type Action =
  | 'stores.approve'
  | 'users.verify'
  | 'users.resetPin'
  | 'stores.suspend'
  | 'users.suspend'
  | 'settings.community'
  | 'categories.manage'
  | 'settings.system'
  | 'admins.manage'

const ALL: AdminRole[] = ['owner', 'community', 'operations']
const MODERATORS: AdminRole[] = ['owner', 'community']

const MATRIX: Record<Action, AdminRole[]> = {
  'stores.approve': ALL,
  'users.verify': ALL,
  'users.resetPin': ALL,
  'stores.suspend': MODERATORS,
  'users.suspend': MODERATORS,
  'settings.community': MODERATORS,
  'categories.manage': MODERATORS,
  'settings.system': ['owner'],
  'admins.manage': ['owner'],
}

export const can = (role: AdminRole | null | undefined, action: Action): boolean => !!role && MATRIX[action].includes(role)

/** Akun admin hanya bisa di-reset owner, dan akun owner tidak bisa di-reset lewat aplikasi. */
export function canResetPinOf(role: AdminRole | null | undefined, target: AdminRole | null): boolean {
  if (!can(role, 'users.resetPin')) return false
  return target === null || (role === 'owner' && target !== 'owner')
}

/** Akun admin hanya bisa ditangguhkan owner, dan owner tidak bisa ditangguhkan. */
export function canSuspendUser(role: AdminRole | null | undefined, target: AdminRole | null): boolean {
  if (!can(role, 'users.suspend')) return false
  return target === null || (role === 'owner' && target !== 'owner')
}

export const ROLE_LABEL: Record<AdminRole, string> = {
  owner: 'Owner (Developer)',
  community: 'Admin Komunitas',
  operations: 'Admin Operasional',
}

export const ROLE_DESC: Record<AdminRole, string> = {
  owner: 'Sistem, database, deployment, dan pengaturan peran admin.',
  community: 'Mengelola komunitas dan membantu moderasi.',
  operations: 'Membantu operasional dan koordinasi penjual.',
}
