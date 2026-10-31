import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

function randomPin(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000
  return String(n).padStart(6, '0')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // 1. Pemanggil harus admin aktif (dicek di server, bukan dipercaya dari UI).
  const caller = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
  const { data: auth } = await caller.auth.getUser()
  if (!auth.user) return json({ error: 'UNAUTHENTICATED' }, 401)
  const { data: me } = await caller.from('profiles').select('admin_role, status').eq('id', auth.user.id).maybeSingle()
  if (!me?.admin_role || me.status !== 'active') return json({ error: 'FORBIDDEN' }, 403)

  const { userId } = await req.json().catch(() => ({}))
  if (typeof userId !== 'string') return json({ error: 'INVALID_INPUT' }, 400)

  // 2. Cek target. Admin boleh membaca semua profil lewat RLS.
  const { data: target } = await caller.from('profiles').select('admin_role').eq('id', userId).maybeSingle()
  if (!target) return json({ error: 'USER_NOT_FOUND' }, 404)
  if (target.admin_role && (me.admin_role !== 'owner' || target.admin_role === 'owner')) return json({ error: 'FORBIDDEN' }, 403)

  // 3. Reset.
  const admin = createClient(url, service)
  const pin = randomPin()
  const { error } = await admin.auth.admin.updateUserById(userId, { password: pin })
  if (error) return json({ error: 'RESET_FAILED' }, 500)
  await admin.from('profiles').update({ must_change_pin: true }).eq('id', userId)
  return json({ pin })
})
