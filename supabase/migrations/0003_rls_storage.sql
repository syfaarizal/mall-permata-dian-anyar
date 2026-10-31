-- Aturan akses (RLS) dan penyimpanan foto.
-- Katalog hanya untuk pengguna yang sudah login (warga). Mau katalog publik? Ganti
-- "to authenticated" pada kebijakan SELECT stores/products/categories menjadi "to anon, authenticated".

alter table public.community_settings enable row level security;
alter table public.profiles           enable row level security;
alter table public.categories         enable row level security;
alter table public.stores             enable row level security;
alter table public.products           enable row level security;
alter table public.product_variants   enable row level security;

create policy settings_admin_all on public.community_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy profiles_select on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles
  for update to authenticated using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy categories_select on public.categories for select to authenticated using (true);
create policy categories_admin_write on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy stores_select on public.stores for select to authenticated using (
  (approval_status = 'approved' and public.is_active_user(owner_id))
  or owner_id = auth.uid() or public.is_admin()
);
create policy stores_insert on public.stores
  for insert to authenticated with check (owner_id = auth.uid());
create policy stores_update on public.stores
  for update to authenticated using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
create policy stores_delete on public.stores
  for delete to authenticated using (owner_id = auth.uid() or public.is_admin());

-- Produk terlihat kalau tokonya terlihat (aturan stores_select berlaku di dalam subquery).
create policy products_select on public.products for select to authenticated using (
  is_active and exists (select 1 from public.stores s where s.id = store_id)
  or public.owns_store(store_id) or public.is_admin()
);
create policy products_write on public.products
  for all to authenticated using (public.owns_store(store_id) or public.is_admin())
  with check (public.owns_store(store_id) or public.is_admin());

create policy variants_select on public.product_variants for select to authenticated using (
  exists (select 1 from public.products p where p.id = product_id)
);
create policy variants_write on public.product_variants
  for all to authenticated using (public.owns_product(product_id) or public.is_admin())
  with check (public.owns_product(product_id) or public.is_admin());

-- Foto: satu bucket publik. Struktur path: {user_id}/products|logo|qris/nama-file.webp
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy media_read on storage.objects for select using (bucket_id = 'media');
create policy media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy media_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
