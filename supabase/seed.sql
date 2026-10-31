-- Kategori awal (2 level). Aman dijalankan ulang.
insert into public.categories (id, parent_id, name, sort_order) values
  (1, null, 'Makanan & Minuman', 1),
  (2, 1, 'Makanan', 1), (3, 1, 'Minuman', 2), (4, 1, 'Kue & Roti', 3),
  (5, null, 'Bahan Segar', 2),
  (6, 5, 'Sayur & Buah', 1), (7, 5, 'Ikan & Ayam', 2), (8, 5, 'Frozen Food', 3),
  (9, null, 'Kebutuhan Rumah', 3),
  (10, 9, 'Galon & Gas', 1), (11, 9, 'Perabot', 2),
  (12, null, 'Hewan', 4),
  (13, 12, 'Makanan Hewan', 1), (14, 12, 'Hewan Hidup', 2),
  (15, null, 'Fashion', 5),
  (16, 15, 'Baju & Celana', 1), (17, 15, 'Tumbler & Lainnya', 2)
on conflict (id) do nothing;
select setval(pg_get_serial_sequence('public.categories', 'id'), (select max(id) from public.categories));
