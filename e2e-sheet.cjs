const { chromium } = require('playwright')
const path = require('path')

const SUPABASE_URL = 'https://mock.supabase.co'
const ANON = 'mock-anon-key'
const USER_ID = 'u-1'

const profile = {
  id: USER_ID, wa_number: '628123456789', name: 'Syifa', block: 'NP4', house_no: '9', rt: 'RT 13',
  is_admin: false, status: 'active', phone_verified_at: '2026-01-01', must_change_pin: false,
}

const store = {
  id: 's-1', owner_id: 'u-2', name: 'Warung Bu Tuti', slug: 'warung-bu-tuti', description: 'Makanan rumahan',
  logo_url: null, cover_url: null, category_id: 1, wa_number: '628999', block_info: 'Blok C3',
  accept_cash: true, accept_qris: true, qris_image_url: null,
  open_time: '06:00', close_time: '22:00', open_days: [0, 1, 2, 3, 4, 5, 6], open_override: 'auto',
  delivery_enabled: true, delivery_cutoff_time: null, delivery_area_note: 'Se-area Permata Dian Anyar',
  auto_reset_stock: false, approval_status: 'approved',
}

const products = [
  {
    id: 'p-1', store_id: 's-1', category_id: 1, name: 'Nasi Goreng Spesial',
    description: 'Nasi goreng kampung dengan ayam, telur, dan acar. Porsi mengenyangkan buat makan siang.',
    price: 18000, unit: 'pcs', image_url: null, stock_mode: 'status', is_available: true,
    stock_count: null, is_active: true, sort_order: 0,
  },
  {
    id: 'p-2', store_id: 's-1', category_id: 1, name: 'Es Teh Manis',
    description: 'Teh manis dingin segelas.', price: 5000, unit: 'gelas',
    image_url: null, stock_mode: 'status', is_available: true, stock_count: null, is_active: true, sort_order: 1,
  },
]

function mockRest(url) {
  const u = new URL(url)
  const p = u.pathname
  const q = u.searchParams
  const send = (body, code = 200) => ({ status: code, body: JSON.stringify(body) })

  if (p.endsWith('/auth/v1/user') && q.get('id') === 'eq') {
    return send(profile)
  }
  if (p.includes('/rest/v1/profiles')) {
    return q.get('id') === 'eq' ? send(profile) : send([profile])
  }
  if (p.includes('/rest/v1/stores')) {
    const slug = q.get('slug')
    const base = slug ? [store] : [store]
    return send(base.map((s) => ({ ...s, products: products.map(({ image_url, is_active, is_available }) => ({ image_url, is_active, is_available })) })))
  }
  if (p.includes('/rest/v1/products')) {
    const id = q.get('id')
    if (id && id.startsWith('eq.')) {
      const wanted = id.slice(3)
      const found = products.find((x) => x.id === wanted) ?? null
      return send(found ? { ...found, store } : null)
    }
    return send(products.map((x) => ({ ...x, store })))
  }
  if (p.includes('/rest/v1/categories')) {
    return send([{ id: 1, parent_id: null, name: 'Makanan', sort_order: 0 }])
  }
  if (p.includes('/rest/v1/community_settings')) {
    return send([{ registration_open: true, block_suggestions: ['A', 'C3'], admin_wa_number: '628' }])
  }
  return send([])
}

async function main() {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page = await ctx.newPage()
  page.on('console', (m) => { if (m.type() === 'error') console.log('  [console error]', m.text().slice(0, 200)) })
  page.on('pageerror', (e) => console.log('  [pageerror]', String(e).slice(0, 300)))

  await page.addInitScript(([url, key, uid]) => {
    const session = {
      access_token: 'mock-token', refresh_token: 'mock-refresh', token_type: 'bearer',
      expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'a@b.c', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
    }
    window.localStorage.setItem('sb-mock-auth-token', JSON.stringify(session))
    window.__MOCK_SESSION__ = session
  }, [SUPABASE_URL, ANON, USER_ID])

  // Intercept Supabase REST + auth.
  await page.route('**://mock.supabase.co/**', async (route) => {
    const req = route.request()
    const url = req.url()
    if (url.includes('/auth/v1/token')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(window.__MOCK_SESSION__ ?? {}) })
    }
    if (url.includes('/auth/v1/user')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(profile) })
    }
    const res = mockRest(url)
    return route.fulfill({ status: res.status, contentType: 'application/json', body: res.body })
  })

  await ctx.route('**/rest/v1/**', async (route) => {
    const res = mockRest(route.request().url())
    return route.fulfill({ status: res.status, contentType: 'application/json', body: res.body })
  })
  await ctx.route('**/auth/v1/**', async (route) => {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(profile) })
  })

  const log = (...a) => console.log(...a)

  // ---- 1. Buka beranda ----
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  log('URL awal:', page.url())
  const adaBeranda = await page.locator('text=Diantar ke').count()
  log('Beranda render?', adaBeranda > 0)

  // ---- 2. Klik produk di carousel "Lagi ready sekarang" ----
  const mini = page.locator('a[href*="produk/"]').first()
  log('Link produk di beranda:', await mini.count() > 0 ? await mini.getAttribute('href') : 'TIDAK ADA')

  if (await mini.count() > 0) {
    await mini.click()
    await page.waitForTimeout(900)
    log('URL setelah klik:', page.url())
  }

  const sheet = page.locator('[role="dialog"]')
  log('Sheet muncul?', await sheet.count() > 0)
  if (await sheet.count() > 0) {
    const box = await page.locator('[role="dialog"] > div').last().boundingBox()
    const vh = page.viewportSize().height
    log(`Tinggi sheet: ${box?.height}px dari ${vh}px layar (${Math.round((box.height / vh) * 100)}%)`)
    log('Judul di sheet:', await sheet.locator('h2').first().textContent().catch(() => '-'))
    log('Ada tombol Tambah?', await sheet.locator('button:has-text("Tambah")').count() > 0)
    log('Ada stepper?', await sheet.locator('button[aria-label="Kurangi"]').count() > 0)
  }

  // Latar masih terlihat?
  const headerVisible = await page.locator('header:has-text("Mall Permata Dian Anyar")').isVisible().catch(() => false)
  log('Header di belakang terlihat?', headerVisible)

  await page.screenshot({ path: 'e2e-sheet-open.png' })

  // ---- 3. Tombol back menutup sheet ----
  await page.goBack()
  await page.waitForTimeout(700)
  log('URL setelah back:', page.url())
  log('Sheet masih ada?', await page.locator('[role="dialog"]').count() > 0)

  // ---- 4. Buka lagi + tekan Tambah -> jadi stepper ----
  const mini2 = page.locator('a[href*="produk/"]').first()
  if (await mini2.count() > 0) {
    await mini2.click()
    await page.waitForTimeout(900)
    const btn = page.locator('[role="dialog"] button:has-text("Tambah")').first()
    if (await btn.count() > 0) {
      await btn.click()
      await page.waitForTimeout(500)
      log('Setelah klik Tambah -> stepper?', await page.locator('[role="dialog"] button[aria-label="Kurangi"]').count() > 0)
      log('Jumlah di stepper:', await page.locator('[role="dialog"] span').filter({ hasText: /^\d+$/ }).first().textContent().catch(() => '-'))
      const plus = page.locator('[role="dialog"] button[aria-label="Tambah"]').first()
      await plus.click()
      await page.waitForTimeout(400)
      log('Jumlah setelah plus:', await page.locator('[role="dialog"] span').filter({ hasText: /^\d+$/ }).first().textContent().catch(() => '-'))
      const cart = await page.evaluate(() => localStorage.getItem('mda.cart.v1'))
      log('Keranjang:', cart)
      await page.screenshot({ path: 'e2e-sheet-stepper.png' })
    }
  }

  // ---- 5. Swipe down menutup ----
  const drag = await page.locator('[role="dialog"] > div').last().boundingBox()
  if (drag) {
    await page.mouse.move(drag.x + drag.width / 2, drag.y + 20)
    await page.mouse.down()
    await page.mouse.move(drag.x + drag.width / 2, drag.y + 200, { steps: 12 })
    await page.mouse.up()
    await page.waitForTimeout(800)
    log('Sheet masih ada setelah swipe down?', await page.locator('[role="dialog"]').count() > 0)
    log('URL setelah swipe:', page.url())
  }

  await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
