import { useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ')

export const inputCls =
  'min-h-12 w-full rounded-lg border border-garis bg-white px-3 text-base text-tinta placeholder:text-tinta-lembut/70'

/**
 * Padding horizontal bawaan ada di sini, jadi override dari pemanggil harus
 * ditulis dengan modifier important (mis. `px-1!`). Tanpa itu utility `px-*`
 * yang sama sama-sama berlaku dan urutan CSS menentukan pemenangnya, bukan
 * urutan class.
 */
export function Button({
  variant = 'primary',
  className,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  return (
    <button
      className={cx(
        // inline-flex + items-center: tanpa ini teks di dalam button widget
        // browser risen ke atas sehingga 글ara dan "+" terlihat meleset dari tengah.
        'inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl px-4 text-center font-bold disabled:opacity-50',
        variant === 'primary' && 'bg-marun-700 text-emas-300',
        variant === 'ghost' && 'border border-garis bg-white text-tinta',
        variant === 'danger' && 'border border-bahaya bg-white text-bahaya',
        className,
      )}
      {...p}
    />
  )
}

/**
 * Tombol pilihan (aktif/tidak). Dipakai untuk hari buka, cara bayar, mode stok.
 * Sama seperti Button, override padding perlu modifier important (mis. `px-1!`).
 */
export function Toggle({ pressed, className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { pressed: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cx(
        'inline-flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl border px-3 text-center font-semibold',
        pressed ? 'border-emas-500 bg-emas-100 text-marun-900' : 'border-garis bg-white text-tinta',
        className,
      )}
      {...p}
    >
      <span className="min-w-0 truncate">{p.children}</span>
    </button>
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

/**
 * Baris yang bisa digulir ke samping. Scrollbar abu-abu disembunyikan; posisi
 * gulir ditunjukkan pil kecil di bawah, ala carousel Shopee.
 */
export function ScrollRow({ children, className, gap = 'gap-2', bleed = true }: { children: ReactNode; className?: string; gap?: string; bleed?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [state, setState] = useState({ scrollable: false, offset: 0 })

  const update = useCallback(() => {
    const el = ref.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    const scrollable = max > 4
    setState({ scrollable, offset: scrollable && max > 0 ? el.scrollLeft / max : 0 })
  }, [])

  useEffect(() => {
    update()
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(update)
    observer.observe(el)
    for (const child of Array.from(el.children)) observer.observe(child)
    return () => observer.disconnect()
  }, [update, children])

  return (
    <div className={className}>
      <div ref={ref} onScroll={update} className={cx('no-scrollbar flex overflow-x-auto', gap, bleed && '-mx-5 px-5')}>
        {children}
      </div>
      {state.scrollable && (
        <div aria-hidden data-scroll-indicator className={cx('mt-2.5 h-1', bleed && '-mx-5 px-5')}>
          <div className="relative h-full w-full">
            <div
              className="absolute h-full rounded-full bg-marun-700/60 transition-[left] duration-150"
              style={{ width: '32px', left: `calc(${state.offset * 100}% - ${state.offset * 32}px)` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export function BrandHeader({ title }: { title?: string }) {
  return (
    <header className="flex items-center gap-3 bg-marun-700 px-5 py-3 text-emas-300">
      <img src="/pwa-192.png" alt="Logo Permata Dian Anyar" className="size-10 rounded-full" />
      <span className="font-bold">{title ?? 'Mall Permata Dian Anyar'}</span>
    </header>
  )
}
