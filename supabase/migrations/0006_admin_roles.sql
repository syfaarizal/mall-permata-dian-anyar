-- Pemisahan peran admin (0006).
--   owner      : pengembang sistem (semua wewenang, termasuk mengatur peran admin)
--   community  : Admin Komunitas (moderasi, pengaturan pendaftaran, kategori)
--   operations : Admin Operasional (verifikasi dan persetujuan penjual, bantu reset PIN)
-- Perubahan bersifat menambah; kolom is_admin tetap ada (dihitung otomatis dari admin_role).

alter table public.profiles
  add column admin_role text check (admin_role in ('owner', 'community', 'operations'));

-- Admin yang sudah ada sebelum pemisahan peran dijadikan owner. Dijalankan SEBELUM trigger sinkronisasi dibuat.
update public.profiles set admin_role = 'owner' where is_admin and admin_role is null;

-- ---------- Fungsi peran ----------
create function public.current_admin_role() returns text
language sql stable security definer set search_path = public as $$
  select admin_role from public.profiles where id = auth.uid() and status = 'active'
$$;

-- Memakai ulang nama is_admin() supaya semua kebijakan RLS yang sudah ada otomatis ikut sadar peran.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_admin_role() is not null
$$;

create function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_admin_role() = 'owner', false)
$$;

create function public.can_moderate() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_admin_role() in ('owner', 'community'), false)
$$;

-- ---------- Penjaga kolom ----------
-- Pembatasan hanya berlaku saat dipanggil langsung oleh pengguna aplikasi (role authenticated/anon).
-- SQL Editor, service role, dan fungsi security definer di bawah ini tidak dibatasi.
create or replace function public.profiles_guard() returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.id := old.id;
    new.wa_number := old.wa_number;
    new.is_admin := old.is_admin;
    new.admin_role := old.admin_role;
    new.status := old.status;
    new.phone_verified_at := old.phone_verified_at;
    new.verified_by := old.verified_by;
    new.must_change_pin := old.must_change_pin;
  end if;
  return new;
end $$;

create or replace function public.stores_guard() returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.approval_status := 'pending';
    else
      new.approval_status := old.approval_status;
      new.owner_id := old.owner_id;
    end if;
  end if;
  return new;
end $$;

-- Menjaga is_admin selalu selaras dengan admin_role. Nama trigger sengaja berurutan setelah profiles_guard_trg.
create function public.profiles_sync_admin() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and old.is_admin and not new.is_admin and new.admin_role is not distinct from old.admin_role then
    new.admin_role := null;  -- dicabut lewat is_admin = false
  end if;
  if new.admin_role is null and new.is_admin and (tg_op = 'INSERT' or not old.is_admin) then
    new.admin_role := 'operations';  -- bila hanya is_admin yang diisi, beri hak paling kecil
  end if;
  new.is_admin := new.admin_role is not null;
  return new;
end $$;
create trigger profiles_sync_admin_trg before insert or update on public.profiles
  for each row execute function public.profiles_sync_admin();

-- Saklar sistem hanya boleh diubah owner.
create function public.settings_guard() returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_owner() then
    if new.require_seller_residency is distinct from old.require_seller_residency
       or new.require_phone_otp is distinct from old.require_phone_otp then
      raise exception 'FORBIDDEN';
    end if;
  end if;
  return new;
end $$;
create trigger settings_guard_trg before update on public.community_settings
  for each row execute function public.settings_guard();

-- ---------- Kebijakan: pengaturan komunitas dan kategori khusus owner + komunitas ----------
drop policy settings_admin_all on public.community_settings;
create policy settings_moderators_all on public.community_settings
  for all to authenticated using (public.can_moderate()) with check (public.can_moderate());

drop policy categories_admin_write on public.categories;
create policy categories_moderators_write on public.categories
  for all to authenticated using (public.can_moderate()) with check (public.can_moderate());

-- ---------- Fungsi admin ----------
create or replace function public.admin_set_store_approval(p_store uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_status not in ('approved', 'rejected', 'suspended', 'pending') then raise exception 'INVALID_STATUS'; end if;
  if p_status = 'suspended' and not public.can_moderate() then raise exception 'FORBIDDEN'; end if;
  select owner_id into v_owner from public.stores where id = p_store;
  if v_owner is null then raise exception 'STORE_NOT_FOUND'; end if;
  if p_status = 'approved'
     and (select phone_verified_at from public.profiles where id = v_owner) is null then
    raise exception 'OWNER_NOT_VERIFIED';
  end if;
  update public.stores set approval_status = p_status where id = p_store;
end $$;

-- Tangguhkan / aktifkan pengguna: owner dan komunitas; admin lain hanya bisa diubah owner.
create function public.admin_set_user_status(p_user uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare v_target text;
begin
  if not public.can_moderate() then raise exception 'FORBIDDEN'; end if;
  if p_status not in ('active', 'suspended') then raise exception 'INVALID_STATUS'; end if;
  if p_user = auth.uid() then raise exception 'FORBIDDEN'; end if;
  select admin_role into v_target from public.profiles where id = p_user;
  if v_target = 'owner' or (v_target is not null and not public.is_owner()) then raise exception 'FORBIDDEN'; end if;
  update public.profiles set status = p_status where id = p_user;
end $$;

-- Beri / cabut peran admin (hanya owner). Peran owner hanya lewat SQL oleh developer.
create function public.admin_set_admin_role(p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
declare v_target text;
begin
  if not public.is_owner() then raise exception 'FORBIDDEN'; end if;
  if p_role is not null and p_role not in ('community', 'operations') then raise exception 'INVALID_ROLE'; end if;
  if p_user = auth.uid() then raise exception 'FORBIDDEN'; end if;
  select admin_role into v_target from public.profiles where id = p_user;
  if not found then raise exception 'USER_NOT_FOUND'; end if;
  if v_target = 'owner' then raise exception 'FORBIDDEN'; end if;
  update public.profiles set admin_role = p_role where id = p_user;
end $$;

-- Kontak konfirmasi penjual: otomatis Admin Operasional yang aktif (tidak lagi satu nomor tetap).
create function public.get_seller_contacts() returns table (name text, wa_number text)
language sql stable security definer set search_path = public as $$
  select p.name, p.wa_number from public.profiles p
  where p.admin_role = 'operations' and p.status = 'active' order by p.created_at
$$;
revoke all on function public.get_seller_contacts() from public, anon;
grant execute on function public.get_seller_contacts() to authenticated;
