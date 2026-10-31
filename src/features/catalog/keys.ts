/**
 * Kunci query katalog. Semua diawali "catalog" supaya satu invalidateQueries
 * dengan queryKey catalogKeys.all menyegarkan seluruh data katalog.
 */
export const catalogKeys = {
  all: ['catalog'] as const,
  stores: ['catalog', 'stores'] as const,
  readyProducts: ['catalog', 'ready-products'] as const,
  store: (slug: string) => ['catalog', 'store', slug] as const,
  storeProducts: (storeId: string) => ['catalog', 'store-products', storeId] as const,
  search: (q: string) => ['catalog', 'search', q] as const,
  /** Harga di keranjang selalu diambil dari server, jadi ikut disegarkan. */
  cartProducts: ['cart-products'] as const,
}
