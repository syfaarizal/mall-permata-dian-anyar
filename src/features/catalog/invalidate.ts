import type { QueryClient } from '@tanstack/react-query'
import { catalogKeys } from './keys'

/**
 * Segarkan seluruh data katalog setelah ada produk/toko yang berubah.
 * Tanpa ini, produk baru tidak muncul di beranda sampai cache kedaluwarsa.
 */
export async function invalidateCatalog(qc: QueryClient) {
  await qc.invalidateQueries({ queryKey: catalogKeys.all })
  await qc.invalidateQueries({ queryKey: catalogKeys.cartProducts })
}
