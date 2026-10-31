-- Fungsi bantu, trigger pengaman, dan fungsi admin.

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

create function public.owns_store(p_store uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.stores where id = p_store and owner_id = auth.uid())
$$;

create function public.owns_product(p_product uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.products p join public.stores s on s.id = p.store_id
    where p.id = p_product and s.owner_id = auth.uid()
  )
$$;

create function public.is_active_user(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = p_user and status = 'active')
$$;

-- Pendaftaran: profil dibuat otomatis saat akun auth dibuat, setelah kode undangan dan blok divalidasi di server.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  s    public.community_settings;
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  select * into s from public.community_settings where id = 1;
  if not s.registration_open then raise exception 'REGISTRATION_CLOSED'; end if;
  if upper(trim(coalesce(meta ->> 'invite_code', ''))) <> upper(trim(s.invite_code)) then
    raise exception 'INVALID_INVITE_CODE';
  end if;
  if not (coalesce(meta ->> 'block', '') = any (s.valid_blocks)) then raise exception 'INVALID_BLOCK'; end if;
  insert into public.profiles (id, wa_number, name, block, house_no)
  values (new.id, meta ->> 'wa_number', meta ->> 'name', meta ->> 'block', meta ->> 'house_no');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Pengguna biasa tidak boleh mengubah kolom sensitif miliknya sendiri.
-- (auth.uid() null = dijalankan dari SQL editor / service role, dibiarkan.)
create function public.profiles_guard() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.id := old.id;
    new.wa_number := old.wa_number;
    new.is_admin := old.is_admin;
    new.status := old.status;
    new.phone_verified_at := old.phone_verified_at;
    new.verified_by := old.verified_by;
    new.must_change_pin := old.must_change_pin;
  end if;
  return new;
end $$;
create trigger profiles_guard_trg before update on public.profiles for each row execute function public.profiles_guard();

-- Penjual tidak boleh menyetujui toko sendiri atau memindahkan kepemilikan.
create function public.stores_guard() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.approval_status := 'pending';
    else
      new.approval_status := old.approval_status;
      new.owner_id := old.owner_id;
    end if;
  end if;
  return new;
end $$;
create trigger stores_guard_trg before insert or update on public.stores for each row execute function public.stores_guard();

-- Publik (sebelum login): cek kode undangan tanpa membocorkan kodenya.
create function public.validate_invite(p_code text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.community_settings
    where id = 1 and registration_open and upper(trim(invite_code)) = upper(trim(p_code))
  )
$$;

create function public.get_public_settings()
returns table (registration_open boolean, valid_blocks text[], admin_wa_number text)
language sql stable security definer set search_path = public as $$
  select registration_open, valid_blocks, admin_wa_number from public.community_settings where id = 1
$$;

-- Admin: verifikasi nomor penjual (setelah pesan konfirmasi WhatsApp diterima).
create function public.admin_verify_phone(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  update public.profiles set phone_verified_at = now(), verified_by = 'admin' where id = p_user;
end $$;

-- Admin: setujui / tolak / tangguhkan toko. Persetujuan butuh nomor penjual terverifikasi.
create function public.admin_set_store_approval(p_store uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_status not in ('approved', 'rejected', 'suspended', 'pending') then raise exception 'INVALID_STATUS'; end if;
  select owner_id into owner from public.stores where id = p_store;
  if owner is null then raise exception 'STORE_NOT_FOUND'; end if;
  if p_status = 'approved'
     and (select phone_verified_at from public.profiles where id = owner) is null then
    raise exception 'OWNER_NOT_VERIFIED';
  end if;
  update public.stores set approval_status = p_status where id = p_store;
end $$;

-- Reset stok "ready" tiap pagi untuk toko yang mengaktifkannya. Dijadwalkan lewat pg_cron (lihat README).
create function public.reset_daily_stock() returns void language sql as $$
  update public.products set is_available = true
  where is_active and stock_mode = 'status'
    and store_id in (select id from public.stores where auto_reset_stock);
$$;
revoke all on function public.reset_daily_stock() from public, anon, authenticated;
