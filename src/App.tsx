import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabaseConfigured } from './lib/supabase'
import { AuthProvider } from './features/auth/AuthContext'
import RequireAuth from './features/auth/RequireAuth'
import { LoginPage, RegisterPage } from './features/auth/AuthPages'
import AppShell from './app/AppShell'
import HomePage from './features/catalog/HomePage'
import { BrandHeader, Notice, Spinner } from './components/ui'
import ErrorBoundary from './components/ErrorBoundary'

// Halaman yang jarang dibuka dimuat belakangan supaya beranda cepat terbuka.
const AccountPage = lazy(() => import('./features/account/AccountPage'))
const AdminPage = lazy(() => import('./features/admin/AdminPage'))
const ChangePinPage = lazy(() => import('./features/auth/ChangePinPage'))
const StorePage = lazy(() => import('./features/catalog/StorePage'))
const CartPage = lazy(() => import('./features/cart/CartPage'))
const OrderConfirmPage = lazy(() => import('./features/cart/OrderConfirmPage'))
const SellerHomePage = lazy(() => import('./features/seller/SellerHomePage'))
const StoreFormPage = lazy(() => import('./features/seller/StoreFormPage'))
const ProductListPage = lazy(() => import('./features/seller/ProductListPage'))
const ProductFormPage = lazy(() => import('./features/seller/ProductFormPage'))

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } })

export default function App() {
  if (!supabaseConfigured) {
    return (
      <div className="mx-auto max-w-md">
        <BrandHeader />
        <div className="p-5"><Notice tone="warn">File .env belum diisi. Salin .env.example ke .env lalu isi URL dan key Supabase.</Notice></div>
      </div>
    )
  }
  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="/masuk" element={<LoginPage />} />
            <Route path="/daftar" element={<RegisterPage />} />
            <Route element={<RequireAuth />}>
              <Route path="ganti-pin" element={<ChangePinPage />} />
              <Route element={<AppShell />}>
                <Route index element={<HomePage />} />
                <Route path="toko/:slug" element={<StorePage />} />
                <Route path="keranjang" element={<CartPage />} />
                <Route path="pesan/:storeId" element={<OrderConfirmPage />} />
                <Route path="akun" element={<AccountPage />} />
                <Route path="admin" element={<AdminPage />} />
                <Route path="jual" element={<SellerHomePage />} />
                <Route path="jual/toko" element={<StoreFormPage />} />
                <Route path="jual/produk" element={<ProductListPage />} />
                <Route path="jual/produk/baru" element={<ProductFormPage />} />
                <Route path="jual/produk/:id" element={<ProductFormPage />} />
              </Route>
            </Route>
          </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
    </ErrorBoundary>
  )
}
