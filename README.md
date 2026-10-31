# Mall Permata Dian Anyar — katalog warga (PWA)

Katalog toko warga Perum Dian Anyar. Pesanan tetap lewat WhatsApp (pesan terstruktur), jadi tidak ada tabel pesanan.
Stack: React + Vite + TypeScript + Tailwind v4 + Supabase (Postgres, Auth, Storage) + PWA. Hosting: Vercel.

## Status tahap
- [x] 1. Fondasi: tema marun/emas, PWA, fungsi inti + tes, halaman uji login
- [x] 2. Database: tabel, RLS, fungsi admin, bucket foto, kategori awal
- [x] 3. Akun: daftar, masuk, alamat antar, penjaga rute (`RequireAuth`), sesi
- [x] 4. Panel penjual: buka toko, pengaturan toko, produk dengan foto duluan, ready/habis, buka/tutup, konfirmasi ke admin
- [x] 5. Katalog pembeli: beranda foto-sentris, halaman toko, search, filter "Ready sekarang", langganan
- [x] 6. Keranjang per toko, pesan WhatsApp terstruktur, halaman QRIS (tanpa tabel pesanan)
- [x] 7. Panel admin (Toko, Pengguna, Pengaturan, kategori) + Edge Function reset PIN + ganti PIN
- [ ] 8. Pilot 5–10 penjual (lihat Kit Pilot)
- [x] 9. Poles: sampul toko, ajakan pasang PWA, banner offline, penjaga error, halaman dimuat belakangan (lazy), jadwal reset stok (opsional)

## Menjalankan
```bash
npm install
cp .env.example .env      # isi URL + key Supabase
npm run dev
npm test                  # tes fungsi inti
```

## Menyiapkan Supabase
1. Buat proyek di supabase.com.
2. SQL Editor: jalankan berurutan `supabase/migrations/0001_schema.sql`, `0002_functions.sql`, `0003_rls_storage.sql`, lalu `supabase/seed.sql`.
   (Atau pakai Supabase CLI: `supabase db push`.)
   Migrasi lanjutan: `0004_admin_panel.sql` (panel admin), `0005_alamat_rt.sql` (blok bebas teks + kolom RT).
3. Authentication → Providers → Email: aktif, **matikan "Confirm email"**. Password minimal 6 karakter (PIN 6 angka).
4. Ganti kode undangan: `update community_settings set invite_code = 'KODE-ACAK-PANJANG';` (pakai kode panjang supaya tidak mudah ditebak).
5. Jadikan diri sendiri owner (setelah daftar lewat aplikasi):
   `update profiles set admin_role = 'owner' where wa_number = '628xxxxxxxxxx';`
   (Admin lain diberi peran lewat tab **Tim** di panel admin, bukan lewat SQL.)
6. Storage: bucket `media` sudah dibuat oleh migrasi.

## Login nomor + PIN
Nomor HP dipetakan ke email internal (`628xx@<VITE_AUTH_EMAIL_DOMAIN>`), PIN jadi password.
Ini rancangan kita sendiri, bukan fitur resmi Supabase (sudah terbukti jalan lewat uji awal). Kalau domain email ditolak, ganti `VITE_AUTH_EMAIL_DOMAIN`.
Catatan: PIN 6 angka itu lemah; pengamannya adalah rate limit bawaan Supabase + kode undangan + persetujuan admin untuk penjual.

## Migrasi ke OTP nanti
Kolom `phone_verified_at`, `verified_by`, saklar `community_settings.require_phone_otp`, dan fungsi tunggal verifikasi nomor sudah disiapkan.
Rencana: pilih penyedia OTP → implementasi langkah verifikasi → nyalakan saklar → user lama verifikasi sekali saat login berikutnya.

## Reset stok pagi (opsional)
Skrip siap pakai: `supabase/optional/schedule-stock-reset.sql` (bukan migrasi, jalankan manual). Aktifkan ekstensi `pg_cron`, lalu jadwalkan (05.00 WIB = 22.00 UTC):
```sql
select cron.schedule('reset-stok-pagi', '0 22 * * *', 'select public.reset_daily_stock()');
```

## Deploy
Hubungkan repo ke Vercel, isi env var yang sama. `vercel.json` sudah menangani SPA.
Free plan Supabase di-pause kalau sepi 7 hari; upgrade sebelum penjual bergantung padanya.

## Struktur dan aturan
```
src/lib/        fungsi murni + tes (phone, storeStatus, whatsapp, format) — jantung aplikasi
src/features/   satu folder per fitur (auth, account, seller; nanti catalog, cart, admin)
src/components/ komponen UI kecil dipakai bersama (ui.tsx)
src/app/        kerangka halaman (AppShell) dan halaman sementara
supabase/       migrasi SQL (urut), seed
```
- Warna tema hanya di `src/index.css` (`@theme`).
- Perubahan tabel selalu lewat file migrasi baru (`0004_...sql`), jangan edit via dashboard saja.
- Aturan akses ada di RLS, bukan hanya di UI. Setelah ubah skema: `supabase gen types typescript` → ganti `src/lib/types.ts`.

## Alamat antar
Blok bebas teks (mis. "C3", "NP4"), tidak dibatasi daftar. Daftar blok di pengaturan admin
sekarang hanya **saran** yang muncul di form. RT opsional, disimpan sebagai "RT 15".
Alamat lengkap ditampilkan di beranda, keranjang, pesan WhatsApp, dan panel admin.

## Panel admin (tahap 7)
Buka `/admin` (tautan ada di halaman Akun untuk admin). Persetujuan toko, verifikasi nomor, reset PIN, pengaturan komunitas, dan kategori semua lewat panel ini.
Setup sekali: jalankan `supabase/migrations/0004_admin_panel.sql`, lalu deploy fungsi reset PIN:
```bash
supabase functions deploy admin-reset-pin
```
Fungsi memakai secret bawaan Supabase (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Pemanggil dicek harus admin di sisi server.

## Alur persetujuan lewat SQL (cadangan, kalau panel admin belum bisa dipakai)
1. Penjual buka toko di menu Jual, lalu kirim konfirmasi lewat tombol WhatsApp ke admin (isi `community_settings.admin_wa_number`).
2. Admin memverifikasi nomor dan alamat, lalu di SQL Editor:
```sql
select public.admin_verify_phone('<id profil penjual>');
select public.admin_set_store_approval('<id toko>', 'approved');
```
Isi nomor admin: `update community_settings set admin_wa_number = '628xxxxxxxxxx';`

## Peran admin (migrasi 0006)
| Aksi | Owner (Developer) | Admin Komunitas | Admin Operasional |
|---|---|---|---|
| Lihat toko dan pengguna | ya | ya | ya |
| Verifikasi nomor, setujui/tolak toko | ya | ya | ya |
| Reset PIN pengguna biasa | ya | ya | ya |
| Tangguhkan toko / pengguna | ya | ya | tidak |
| Kode undangan, blok, pendaftaran, kategori | ya | ya | tidak |
| Saklar sistem (OTP, wajib warga) | ya | tidak | tidak |
| Beri/cabut peran admin, reset PIN akun admin | ya | tidak | tidak |

- Aturan ditegakkan di database (RLS, trigger, fungsi `security definer`) dan Edge Function, bukan hanya disembunyikan di UI. Tabel di atas sama dengan `src/lib/permissions.ts` (UI) dan `0006_admin_roles.sql` (server); ubah keduanya sekaligus.
- Peran `owner` hanya bisa diberikan lewat SQL oleh developer. Akun owner tidak bisa ditangguhkan atau di-reset PIN-nya dari aplikasi.
- Kontak konfirmasi penjual otomatis mengikuti Admin Operasional yang aktif (`get_seller_contacts`). Nomor di Pengaturan hanya cadangan.
- Setelah menerapkan 0006, deploy ulang fungsi: `supabase functions deploy admin-reset-pin`.

### Menguji aturan peran di Postgres lokal (opsional)
```bash
createdb mda_test
psql -d mda_test -f supabase/tests/stubs.sql
for f in supabase/migrations/000{1,2,3,4,5}_*.sql; do psql -d mda_test -f $f; done
# buat beberapa akun uji di auth.users, jadikan satu is_admin=true, lalu:
psql -d mda_test -f supabase/migrations/0006_admin_roles.sql
psql -d mda_test -f supabase/tests/roles_test.sql   # cari baris PASS / FAIL
```
