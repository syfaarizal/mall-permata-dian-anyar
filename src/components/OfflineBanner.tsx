import { useSyncExternalStore } from 'react'

const subscribe = (cb: () => void) => {
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => {
    window.removeEventListener('online', cb)
    window.removeEventListener('offline', cb)
  }
}

export default function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true)
  if (online) return null
  return <p role="status" className="bg-emas-100 px-5 py-2 text-center text-sm font-semibold text-peringatan">Tidak ada koneksi internet. Data mungkin belum terbaru.</p>
}
