import { describe, expect, it } from 'vitest'
import { DISMISS_DAYS, isDismissed, isIosSafari } from './pwa'

const DAY = 86_400_000
describe('pwa helpers', () => {
  it('mengenali Safari iPhone dan menolak Chrome iOS', () => {
    expect(isIosSafari('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1')).toBe(true)
    expect(isIosSafari('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/120 Mobile/15E148 Safari/604.1')).toBe(false)
    expect(isIosSafari('Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile Safari/537.36')).toBe(false)
  })
  it('ajakan pasang tersembunyi sementara setelah ditutup', () => {
    const now = 100 * DAY
    expect(isDismissed(null, now)).toBe(false)
    expect(isDismissed(String(now - 2 * DAY), now)).toBe(true)
    expect(isDismissed(String(now - (DISMISS_DAYS + 1) * DAY), now)).toBe(false)
    expect(isDismissed('bukan angka', now)).toBe(false)
  })
})
