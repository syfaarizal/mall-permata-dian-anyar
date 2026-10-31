import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getStoreStatus, type StoreSchedule, type StoreStatus } from './storeStatus'

const NowContext = createContext<Date | null>(null)

/**
 * Jam yang berjalan terus, supaya status buka/tutup toko ikut berubah sendiri
 * tanpa harus refresh halaman.
 */
export function NowProvider({ children, intervalMs = 30_000 }: { children: ReactNode; intervalMs?: number }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return <NowContext.Provider value={now}>{children}</NowContext.Provider>
}

/** Waktu sekarang, diperbarui otomatis. Dipakai untuk menghitung status toko. */
export function useNow(): Date {
  const shared = useContext(NowContext)
  const [local, setLocal] = useState(() => new Date())
  useEffect(() => {
    if (shared) return
    const t = setInterval(() => setLocal(new Date()), 30_000)
    return () => clearInterval(t)
  }, [shared])
  return shared ?? local
}

/** Status buka/tutup toko, ikut diperbarui sendiri saat jam berjalan. */
export function useStoreStatus(store: StoreSchedule | null | undefined): StoreStatus {
  const now = useNow()
  return getStoreStatus(
    store ?? { open_time: null, close_time: null, open_days: [], open_override: 'auto', delivery_enabled: false, delivery_cutoff_time: null },
    now,
  )
}
