export type StoreStatusKind = 'open_delivery' | 'open_pickup' | 'closed'

export interface StoreSchedule {
  open_time: string | null // 'HH:MM[:SS]'
  close_time: string | null
  open_days: number[] // 1 = Senin ... 7 = Minggu
  open_override: 'auto' | 'open' | 'closed'
  delivery_enabled: boolean
  delivery_cutoff_time: string | null
}

export interface StoreStatus {
  kind: StoreStatusKind
  label: string
  opensAt: string | null
  canOrder: boolean
  canDeliver: boolean
}

const ISO_DAY: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }
const MINUTES_PER_DAY = 1440

export function jakartaNow(now: Date): { isoDay: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return { isoDay: ISO_DAY[get('weekday')], minutes: Number(get('hour')) * 60 + Number(get('minute')) }
}

const toMinutes = (t: string) => {
  const [h, m] = t.split(':')
  return Number(h) * 60 + Number(m)
}
const fmt = (t: string) => t.slice(0, 5).replace(':', '.')

function isWithinSchedule(s: StoreSchedule, isoDay: number, min: number): boolean {
  const prevDay = isoDay === 1 ? 7 : isoDay - 1
  if (!s.open_time || !s.close_time) return s.open_days.includes(isoDay)
  const open = toMinutes(s.open_time)
  const close = toMinutes(s.close_time)
  if (open <= close) return s.open_days.includes(isoDay) && min >= open && min < close
  // jam buka melewati tengah malam
  return (s.open_days.includes(isoDay) && min >= open) || (s.open_days.includes(prevDay) && min < close)
}

/**
 * Apakah masih bisa diantar pada menit ini.
 *
 * Batas antar ("antar sampai jam 00.00") dibandingkan dalam hitungan menit absolut
 * satu hari, supaya tengah malam tidak dianggap "sudah lewat". Kalau toko buka
 * melewati tengah malam, menit dini hari dihitung sebagai belonging ke hari berikutnya
 * supaya batas jam tetap berlaku.
 */
function canDeliverAt(s: StoreSchedule, minutes: number, open: number, close: number): boolean {
  if (!s.delivery_enabled) return false
  const cutoff = s.delivery_cutoff_time
  if (cutoff === null) return true
  const cutoffMinutes = toMinutes(cutoff)
  const cutoffAbs = cutoffMinutes === 0 ? MINUTES_PER_DAY : cutoffMinutes >= open ? cutoffMinutes : cutoffMinutes + MINUTES_PER_DAY
  const nowAbs = open > close && minutes < open ? minutes + MINUTES_PER_DAY : minutes
  return nowAbs < cutoffAbs
}

/** Status toko saat ini (waktu WIB). Fungsi murni: gampang dites dan diubah. */
export function getStoreStatus(s: StoreSchedule, now: Date = new Date()): StoreStatus {
  const { isoDay, minutes } = jakartaNow(now)

  const closed = (opensAt: string | null = null): StoreStatus => ({
    kind: 'closed',
    label: opensAt ? `Tutup · buka ${opensAt}` : 'Tutup',
    opensAt,
    canOrder: false,
    canDeliver: false,
  })

  if (s.open_override === 'closed') return closed()

  const hasTimes = Boolean(s.open_time && s.close_time)
  const open = hasTimes ? toMinutes(s.open_time!) : 0
  const close = hasTimes ? toMinutes(s.close_time!) : MINUTES_PER_DAY
  const isOpen = s.open_override === 'open' || isWithinSchedule(s, isoDay, minutes)
  if (!isOpen) {
    const upcoming =
      s.open_time && s.open_days.includes(isoDay) && minutes < toMinutes(s.open_time) ? fmt(s.open_time) : null
    return closed(upcoming)
  }

  if (canDeliverAt(s, minutes, open, close)) {
    return {
      kind: 'open_delivery',
      label: s.delivery_cutoff_time ? `Buka · antar sampai ${fmt(s.delivery_cutoff_time)}` : 'Buka · bisa diantar',
      opensAt: null,
      canOrder: true,
      canDeliver: true,
    }
  }
  return { kind: 'open_pickup', label: 'Buka · ambil sendiri saja', opensAt: null, canOrder: true, canDeliver: false }
}
