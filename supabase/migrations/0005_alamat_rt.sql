-- Alamat antar: blok jadi teks bebas (mis. "C3", "NP4") dan tambah RT.
-- 1. profiles bertambah kolom rt (opsional).
-- 2. community_settings.valid_blocks renamed jadi block_suggestions: daftarnya
--    sekarang hanya saran yang muncul di form, bukan pembatas server.
--
-- Aman dijalankan ulang: rename/add column dikasih cek, dan fungsi yang
-- bentuk OUT-param-nya berubah di-drop dulu (Postgres tidak bisa
-- create or replace fungsi yang tipe baliknya beda).

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'community_settings' and column_name = 'valid_blocks'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'community_settings' and column_name = 'block_suggestions'
  ) then
    alter table public.community_settings rename column valid_blocks to block_suggestions;
  end if;
end $$;

alter table public.profiles add column if not exists rt text check (rt is null or char_length(rt) <= 20);

-- Batas panjang blok; blok yang sudah ada tidak dicek ulang, yang baru saja.
alter table public.profiles drop constraint if exists profiles_block_length;
alter table public.profiles add constraint profiles_block_length check (char_length(block) between 1 and 30) not valid;

-- Daftar blok tidak lagi membatasi pendaftaran: blok bebas, server cuma menolak
-- blok kosong atau kepanjangan.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  s    public.community_settings;
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  blk  text := trim(coalesce(meta ->> 'block', ''));
begin
  select * into s from public.community_settings where id = 1;
  if not s.registration_open then raise exception 'REGISTRATION_CLOSED'; end if;
  if upper(trim(coalesce(meta ->> 'invite_code', ''))) <> upper(trim(s.invite_code)) then
    raise exception 'INVALID_INVITE_CODE';
  end if;
  if blk = '' or char_length(blk) > 30 then raise exception 'INVALID_BLOCK'; end if;
  insert into public.profiles (id, wa_number, name, block, house_no, rt)
  values (new.id, meta ->> 'wa_number', meta ->> 'name', blk, meta ->> 'house_no',
          nullif(trim(coalesce(meta ->> 'rt', '')), ''));
  return new;
end $$;

drop function if exists public.get_public_settings();

create function public.get_public_settings()
returns table (registration_open boolean, block_suggestions text[], admin_wa_number text)
language sql stable security definer set search_path = public as $$
  select registration_open, block_suggestions, admin_wa_number from public.community_settings where id = 1
$$;
