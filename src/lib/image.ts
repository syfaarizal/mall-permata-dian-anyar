export function fitWithin(w: number, h: number, max: number) {
  const scale = Math.min(1, max / Math.max(w, h))
  return { width: Math.round(w * scale), height: Math.round(h * scale) }
}

const MAX_BYTES = 900_000 // batas bucket 1 MB

/** Kecilkan dan ubah foto ke WebP di browser sebelum diunggah. */
export async function compressImage(file: File, maxSide = 1280): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  for (const quality of [0.82, 0.7, 0.55, 0.4]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', quality))
    if (blob && blob.size <= MAX_BYTES) return blob
  }
  throw new Error('Foto terlalu besar. Coba foto lain.')
}
