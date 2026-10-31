import { useQuery } from '@tanstack/react-query'
import { fetchCategories, fetchMyStore, fetchProduct, fetchProducts } from './api'

export const keys = {
  store: (uid: string) => ['my-store', uid] as const,
  products: (storeId: string) => ['products', storeId] as const,
  product: (id: string) => ['product', id] as const,
}

export const useMyStore = (uid: string) => useQuery({ queryKey: keys.store(uid), queryFn: () => fetchMyStore(uid) })
export const useCategories = () => useQuery({ queryKey: ['categories'], queryFn: fetchCategories, staleTime: 10 * 60_000 })
export const useProducts = (storeId?: string) =>
  useQuery({ queryKey: keys.products(storeId ?? ''), queryFn: () => fetchProducts(storeId!), enabled: !!storeId })
export const useProduct = (id?: string) => useQuery({ queryKey: keys.product(id ?? ''), queryFn: () => fetchProduct(id!), enabled: !!id })
