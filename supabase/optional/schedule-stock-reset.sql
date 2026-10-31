-- OPSIONAL (bukan migrasi): jadwal reset stok "ready" tiap pagi.
-- Jalankan manual di SQL Editor setelah mengaktifkan ekstensi pg_cron
-- (Dashboard Supabase: Database > Extensions > pg_cron).
-- 05.00 WIB = 22.00 UTC. Hanya toko yang mengaktifkan "Reset stok tiap pagi" yang terpengaruh.

select cron.schedule('reset-stok-pagi', '0 22 * * *', 'select public.reset_daily_stock()');

-- Cek jadwal:    select * from cron.job;
-- Hentikan:      select cron.unschedule('reset-stok-pagi');
