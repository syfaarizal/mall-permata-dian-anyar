import { useQuery } from '@tanstack/react-query'
import { fetchCategories } from '../seller/api'
import { fetchProductWithStore, fetchProductsByIds, fetchReadyProducts, fetchStoreBySlug, fetchStoreProducts, fetchStores, searchProducts } from './api'
import { catalogKeys } from './keys'

export const useStores = () => useQuery({ queryKey: catalogKeys.stores, queryFn: fetchStores })
export const useStoreBySlug = (slug?: string) =>
  useQuery({ queryKey: catalogKeys.store(slug ?? ''), queryFn: () => fetchStoreBySlug(slug!), enabled: !!slug })
export const useStoreProducts = (storeId?: string) =>
  useQuery({ queryKey: catalogKeys.storeProducts(storeId ?? ''), queryFn: () => fetchStoreProducts(storeId!), enabled: !!storeId })
export const useReadyProducts = () => useQuery({ queryKey: catalogKeys.readyProducts, queryFn: fetchReadyProducts })
export const useProductDetail = (id?: string) =>
  useQuery({ queryKey: catalogKeys.product(id ?? ''), queryFn: () => fetchProductWithStore(id!), enabled: !!id })
export const useProductSearch = (q: string) =>
  useQuery({ queryKey: catalogKeys.search(q), queryFn: () => searchProducts(q), enabled: q.trim().length >= 2 })
export const useCatalogCategories = () => useQuery({ queryKey: ['categories'], queryFn: fetchCategories, staleTime: 10 * 60_000 })
export const useCartProducts = (ids: string[]) => {
  const key = [...ids].sort().join(',')
  return useQuery({ queryKey: [...catalogKeys.cartProducts, key], queryFn: () => fetchProductsByIds(ids), enabled: ids.length > 0, staleTime: 10_000 })
}
