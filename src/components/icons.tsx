/**
 * Ikon garis untuk tombol tambah/kurangi.
 *
 * Karakter "+" dan "−" digambar dengan posisi tinta yang bergantung pada font
 * sistem: di device tertentu glyph-nya meleset beberapa piksel ke bawah dari
 * tengah tombol. SVG digambar oleh browser, jadi posisinya selalu tepat di
 * tengah kotak.
 */

export function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function MinusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden className={className}>
      <path d="M5 12h14" />
    </svg>
  )
}
