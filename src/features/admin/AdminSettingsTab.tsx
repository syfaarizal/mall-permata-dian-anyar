import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Field, Notice, Spinner, Toggle, inputCls } from '../../components/ui'
import { normalizePhone } from '../../lib/phone'
import { saveSettings, type CommunitySettings } from './api'
import { useAdminSettings } from './hooks'
import { friendlyError, generateInviteCode, parseBlocks, validateSettings } from './logic'
import CategoryManager from './CategoryManager'
import { useAuth } from '../auth/AuthContext'
import { can } from '../../lib/permissions'

function SettingsForm({ s }: { s: CommunitySettings }) {
  const qc = useQueryClient()
  const isOwner = can(useAuth().profile?.admin_role, 'settings.system')
  const [code, setCode] = useState(s.invite_code)
  const [blocks, setBlocks] = useState(s.block_suggestions.join(', '))
  const [wa, setWa] = useState(s.admin_wa_number ?? '')
  const [open, setOpen] = useState(s.registration_open)
  const [residency, setResidency] = useState(s.require_seller_residency)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const save = useMutation({
    mutationFn: () =>
      saveSettings({
        invite_code: code.trim(),
        block_suggestions: parseBlocks(blocks),
        admin_wa_number: wa.trim() ? normalizePhone(wa) : null,
        registration_open: open,
        ...(isOwner ? { require_seller_residency: residency } : {}),
      }),
    onSuccess: () => { setMsg({ ok: true, text: 'Pengaturan tersimpan.' }); void qc.invalidateQueries({ queryKey: ['admin-settings'] }); void qc.invalidateQueries({ queryKey: ['public-settings'] }) },
    onError: (e) => setMsg({ ok: false, text: friendlyError(e.message) }),
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validateSettings({ invite_code: code, block_suggestions: blocks, admin_wa_number: wa }, normalizePhone)
    setErrors(errs)
    if (Object.keys(errs).length === 0) save.mutate()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Card>
        <p className="font-bold">Pendaftaran warga</p>
        <Field label="Kode undangan" error={errors.invite_code} hint="Bagikan lewat grup WhatsApp. Ganti kalau bocor ke orang luar.">
          <div className="flex gap-2">
            <input className={inputCls} value={code} onChange={(e) => setCode(e.target.value)} />
            <Button type="button" variant="ghost" className="flex-none px-3!" onClick={() => setCode(generateInviteCode())}>Acak</Button>
          </div>
        </Field>
        <div className="flex items-center justify-between gap-3">
          <div><p className="font-semibold">Pendaftaran baru</p><p className="text-xs text-tinta-lembut">Kalau ditutup, kode undangan ditolak.</p></div>
          <Toggle pressed={open} onClick={() => setOpen(!open)}>{open ? 'Dibuka' : 'Ditutup'}</Toggle>
        </div>
        <Field label="Saran nama blok" hint="Hanya saran yang muncul di form, warga bebas mengetik blok lain. Contoh: A, C3, NP4">
          <input className={inputCls} value={blocks} onChange={(e) => setBlocks(e.target.value)} />
        </Field>
      </Card>
      <Card>
        <p className="font-bold">Penjual</p>
        <Field label="Nomor WhatsApp admin" error={errors.admin_wa_number} hint="Cadangan saja. Kontak utama otomatis mengikuti Admin Operasional."><input className={inputCls} inputMode="tel" value={wa} onChange={(e) => setWa(e.target.value)} /></Field>
        <div className="flex items-center justify-between gap-3">
          <div><p className="font-semibold">Wajib warga perum</p><p className="text-xs text-tinta-lembut">Alamat penjual dicek admin.{!isOwner && ' Hanya owner yang bisa mengubah.'}</p></div>
          <Toggle pressed={residency} disabled={!isOwner} onClick={() => setResidency(!residency)}>{residency ? 'Aktif' : 'Mati'}</Toggle>
        </div>
      </Card>
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div><p className="font-semibold">Verifikasi OTP</p><p className="text-xs text-tinta-lembut">Belum tersedia: butuh penyedia OTP. Verifikasi masih manual lewat WhatsApp.</p></div>
          <span className="text-sm font-bold text-tinta-lembut">{s.require_phone_otp ? 'Aktif' : 'Mati'}</span>
        </div>
      </Card>
      {msg && <Notice tone={msg.ok ? 'ok' : 'bad'}>{msg.text}</Notice>}
      <Button type="submit" disabled={save.isPending}>Simpan pengaturan</Button>
    </form>
  )
}

export default function AdminSettingsTab() {
  const { data, isLoading } = useAdminSettings()
  if (isLoading) return <Spinner />
  if (!data) return <Notice tone="bad">Gagal memuat pengaturan.</Notice>
  return (
    <div className="flex flex-col gap-4">
      <SettingsForm s={data} />
      <CategoryManager />
    </div>
  )
}
