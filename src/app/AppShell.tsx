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
    { to: '/keranjang', label: count ? `Keranjang (${count})` : 'Keranjang', end: false },
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
              cx('min-h-12 flex-1 rounded-xl border px-1 py-3 text-center text-sm font-semibold', isActive ? 'border-emas-500 bg-emas-100 text-marun-900' : 'border-garis bg-white')
            }
          >
            {i.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
