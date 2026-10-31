import { useEffect, useState } from 'react'
import { DISMISS_DAYS, isDismissed, isIosSafari, isStandalone } from '../lib/pwa'

interface InstallEvent extends Event {
  prompt: () => Promise<void>
}
const KEY = 'mda.install.dismissed'
const read = () => {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

/** Ajakan pasang ke layar utama: tombol langsung di Android, petunjuk manual di iPhone. */
export default function InstallPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null)
  const [hidden, setHidden] = useState(() => isDismissed(read(), Date.now()))
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setEvent(e as InstallEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  const ios = isIosSafari(navigator.userAgent)
  if (hidden || isStandalone() || (!event && !ios)) return null

  const close = () => {
    try {
      localStorage.setItem(KEY, String(Date.now()))
    } catch {
      /* abaikan */
    }
    setHidden(true)
  }
  return (
    <div role="region" aria-label="Pasang aplikasi" className="flex flex-col gap-2 rounded-2xl border border-emas-500 bg-emas-100 p-3 text-sm text-marun-900">
      <p className="font-bold">Pasang di layar utama</p>
      <p>{event ? 'Buka lebih cepat tanpa mengetik alamat, seperti aplikasi biasa.' : 'Ketuk ikon bagikan di Safari, lalu pilih “Tambah ke Layar Utama”.'}</p>
      <div className="flex gap-2">
        {event && (
          <button type="button" className="min-h-11 flex-1 rounded-xl bg-marun-700 px-3 font-bold text-emas-300" onClick={async () => { await event.prompt(); setEvent(null); close() }}>Pasang</button>
        )}
        <button type="button" className="min-h-11 flex-1 rounded-xl border border-garis bg-white px-3 font-semibold" onClick={close} title={`Disembunyikan ${DISMISS_DAYS} hari`}>Nanti saja</button>
      </div>
    </div>
  )
}
