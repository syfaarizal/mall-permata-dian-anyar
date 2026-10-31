export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

/** Slug unik: nama + akhiran acak pendek. */
export function makeSlug(name: string, rand: () => number = Math.random): string {
  const suffix = Math.floor(rand() * 36 ** 4).toString(36).padStart(4, '0')
  return `${slugify(name) || 'toko'}-${suffix}`
}
