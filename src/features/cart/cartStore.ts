import { useSyncExternalStore } from 'react'
import { addLine, emptyCart, parseCart, removeStore, setMeta, setQty, type CartState, type StoreMeta } from './cartLogic'

const KEY = 'mda.cart.v1'
const read = (): string | null => {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

let state: CartState = parseCart(read())
const listeners = new Set<() => void>()

function commit(next: CartState) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* tetap jalan di memori */
  }
  listeners.forEach((l) => l())
}

// Sinkron antar tab.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      state = parseCart(e.newValue)
      listeners.forEach((l) => l())
    }
  })
}

export const cartActions = {
  add: (productId: string, storeId: string) => commit(addLine(state, productId, storeId)),
  setQty: (productId: string, qty: number) => commit(setQty(state, productId, qty)),
  removeStore: (storeId: string) => commit(removeStore(state, storeId)),
  setMeta: (storeId: string, patch: Partial<StoreMeta>) => commit(setMeta(state, storeId, patch)),
  addMany: (storeId: string, items: { productId: string; qty: number }[]) =>
    commit(items.reduce((s, i) => addLine(s, i.productId, storeId, i.qty), state)),
  clear: () => commit(emptyCart()),
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
export const useCart = (): CartState => useSyncExternalStore(subscribe, () => state, () => state)
