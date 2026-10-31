-- Mall Permata Dian Anyar: skema awal.
-- Prinsip: yang menempel ke toko disimpan di stores, yang menempel ke barang di products.
-- Pesanan sengaja TIDAK disimpan (WhatsApp jadi inbox pesanan).

create extension if not exists pg_trgm;

create table public.community_settings (
  id                       int primary key default 1 check (id = 1),
  invite_code              text not null,
  registration_open        boolean not null default true,
  valid_blocks             text[] not null default '{A,B,C,D,E,F,G,H}',
  admin_wa_number          text,
  require_seller_residency boolean not null default true,
  require_phone_otp        boolean not null default false,  -- saklar migrasi ke OTP
  updated_at               timestamptz not null default now()
);
insert into public.community_settings (invite_code) values ('GANTI-KODE-INI') on conflict do nothing;

create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  wa_number         text not null unique check (wa_number ~ '^628[0-9]{8,11}$'),
  name              text not null check (char_length(name) between 2 and 60),
  block             text not null,
  house_no          text not null,
  is_admin          boolean not null default false,
  status            text not null default 'active' check (status in ('active', 'suspended')),
  phone_verified_at timestamptz,
  verified_by       text check (verified_by in ('admin', 'otp')),
  must_change_pin   boolean not null default false,
  created_at        timestamptz not null default now(),
  last_login_at     timestamptz
);

create table public.categories (
  id         serial primary key,
  parent_id  int references public.categories (id) on delete set null,
  name       text not null,
  icon       text,
  sort_order int not null default 0
);

create table public.stores (
  id                   uuid primary key default gen_random_uuid(),
  owner_id             uuid not null references public.profiles (id) on delete cascade,
  name                 text not null check (char_length(name) between 2 and 60),
  slug                 text not null unique,
  description          text,
  logo_url             text,
  cover_url            text,
  category_id          int references public.categories (id),
  wa_number            text not null check (wa_number ~ '^628[0-9]{8,11}$'),
  block_info           text,
  -- pembayaran
  accept_cash          boolean not null default true,
  accept_qris          boolean not null default false,
  qris_image_url       text,
  -- jam buka (WIB), tanpa zona waktu; dihitung di aplikasi
  open_time            time,
  close_time           time,
  open_days            smallint[] not null default '{1,2,3,4,5,6,7}',
  open_override        text not null default 'auto' check (open_override in ('auto', 'open', 'closed')),
  -- delivery
  delivery_enabled     boolean not null default true,
  delivery_cutoff_time time,
  delivery_area_note   text,
  auto_reset_stock     boolean not null default false,
  approval_status      text not null default 'pending'
                       check (approval_status in ('pending', 'approved', 'rejected', 'suspended')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint payment_required check (accept_cash or accept_qris)
);

create table public.products (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references public.stores (id) on delete cascade,
  category_id  int references public.categories (id),  -- null = ikut kategori toko
  name         text not null check (char_length(name) between 2 and 80),
  description  text,
  price        int not null check (price >= 0),         -- rupiah, tanpa desimal
  unit         text not null default 'porsi',
  image_url    text,
  stock_mode   text not null default 'status' check (stock_mode in ('status', 'count')),
  is_available boolean not null default true,
  stock_count  int check (stock_count is null or stock_count >= 0),
  is_active    boolean not null default true,           -- soft delete
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.product_variants (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id) on delete cascade,
  name           text not null,
  price_override int check (price_override is null or price_override >= 0),
  is_available   boolean not null default true,
  stock_count    int check (stock_count is null or stock_count >= 0)
);

create index stores_owner_idx on public.stores (owner_id);
create index stores_approved_idx on public.stores (category_id) where approval_status = 'approved';
create index products_store_idx on public.products (store_id) where is_active;
create index stores_name_trgm on public.stores using gin (name gin_trgm_ops);
create index products_name_trgm on public.products using gin (name gin_trgm_ops);
create index variants_product_idx on public.product_variants (product_id);

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger stores_touch before update on public.stores for each row execute function public.touch_updated_at();
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();
