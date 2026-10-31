/** Safari di iPhone/iPad (tidak punya prompt pasang otomatis, jadi perlu petunjuk manual). */
export function isIosSafari(ua: string): boolean {
  return /iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua)
}

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

export const DISMISS_DAYS = 14

/** Ajakan pasang disembunyikan selama DISMISS_DAYS setelah ditutup. */
export function isDismissed(raw: string | null, now: number): boolean {
  const t = Number(raw)
  return Number.isFinite(t) && t > 0 && now - t < DISMISS_DAYS * 86_400_000
}
