import type { ButtonHTMLAttributes, ReactNode } from 'react'

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ')

export const inputCls =
  'min-h-12 w-full rounded-lg border border-garis bg-white px-3 text-base text-tinta placeholder:text-tinta-lembut/70'

export function Button({
  variant = 'primary',
  className,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  return (
    <button
      className={cx(
        'min-h-12 rounded-xl px-4 font-bold disabled:opacity-50',
        variant === 'primary' && 'bg-marun-700 text-emas-300',
        variant === 'ghost' && 'border border-garis bg-white text-tinta',
        variant === 'danger' && 'border border-bahaya bg-white text-bahaya',
        className,
      )}
      {...p}
    />
  )
}

/** Tombol pilihan (aktif/tidak). Dipakai untuk hari buka, cara bayar, mode stok. */
export function Toggle({ pressed, className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { pressed: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cx(
        'min-h-12 rounded-xl border px-3 font-semibold',
        pressed ? 'border-emas-500 bg-emas-100 text-marun-900' : 'border-garis bg-white text-tinta',
        className,
      )}
      {...p}
    />
  )
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      <span>{label}</span>
      {children}
      {hint && !error && <span className="text-xs font-normal text-tinta-lembut">{hint}</span>}
      {error && <span role="alert" className="text-xs font-semibold text-bahaya">{error}</span>}
    </label>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cx('flex flex-col gap-3 rounded-2xl border border-garis bg-white p-4', className)}>{children}</section>
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'bad' | 'ok'; children: ReactNode }) {
  const tones = { info: 'bg-emas-100 text-marun-900', warn: 'bg-emas-100 text-peringatan', bad: 'bg-marun-50 text-bahaya', ok: 'bg-emerald-50 text-ok' }
  return <p role="status" className={cx('rounded-xl p-3 text-sm', tones[tone])}>{children}</p>
}

export function Spinner() {
  return <p className="p-6 text-center text-tinta-lembut">Memuat…</p>
}

export function BrandHeader({ title }: { title?: string }) {
  return (
    <header className="flex items-center gap-3 bg-marun-700 px-5 py-3 text-emas-300">
      <img src="/pwa-192.png" alt="Logo Permata Dian Anyar" className="size-10 rounded-full" />
      <span className="font-bold">{title ?? 'Mall Permata Dian Anyar'}</span>
    </header>
  )
}
