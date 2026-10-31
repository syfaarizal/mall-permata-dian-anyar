import { NavLink, Outlet } from 'react-router'
import { BrandHeader, cx } from '../components/ui'
import { useCart } from '../features/cart/cartStore'
import { totalItems } from '../features/cart/cartLogic'
import InstallPrompt from '../components/InstallPrompt'
import OfflineBanner from '../components/OfflineBanner'

export default function AppShell() {
  const count = totalItems(useCart())
  const items = [
    { to: '/', label: 'Beranda', end: true },
    { to: '/keranjang', label: 'Keranjang', badge: count || null, end: false },
    { to: '/jual', label: 'Jual', end: false },
    { to: '/akun', label: 'Akun', end: false },
  ]
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <BrandHeader />
      <OfflineBanner />
      <main className="flex flex-1 flex-col gap-4 px-5 py-4">
        <InstallPrompt />
        <Outlet />
      </main>
      <nav className="sticky bottom-0 flex gap-1.5 border-t border-garis bg-krem px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {items.map((i) => (
          <NavLink
            key={i.to}
            to={i.to}
            end={i.end}
            className={({ isActive }) =>
              cx(
                // Badge jumlah item diletakkan sebaris dengan label, bukan
                // sebagai "Keranjang (1)" atau badge di pojok: keduanya bikin
                // teks melebar dan label lain ikut terpotong di layar sempit.
                'flex min-h-12 flex-1 items-center justify-center gap-0.5 rounded-xl border px-0.5 py-3 text-center text-xs font-semibold whitespace-nowrap',
                isActive ? 'border-emas-500 bg-emas-100 text-marun-900' : 'border-garis bg-white',
              )
            }
          >
            {i.label}
            {i.badge && (
              <span
                aria-label={`${i.badge} item di keranjang`}
                className="inline-flex size-4 flex-none items-center justify-center rounded-full bg-marun-700 text-[10px] font-bold text-emas-300"
              >
                {i.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
