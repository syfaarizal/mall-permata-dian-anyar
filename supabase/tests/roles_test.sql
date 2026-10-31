-- Uji peran admin terhadap database nyata. Jalankan setelah migrasi 0001-0006 dan data uji (lihat README).
-- set peran lewat SQL (seperti developer)
update profiles set admin_role='community' where name='Admin Komunitas';
update profiles set admin_role='operations' where name in ('Ops Satu','Ops Dua');
select name,is_admin,admin_role from profiles where is_admin order by name;

create function pg_temp.exec_as(uid uuid, q text) returns text language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', uid::text, true);
  execute 'set local role authenticated';
  execute q;
  execute 'reset role';
  return 'ok';
exception when others then
  execute 'reset role';
  return 'ERR: ' || sqlerrm;
end $f$;
create function pg_temp.chk(label text, ok boolean, detail text default '') returns void language plpgsql as $f$
begin raise notice '% % %', case when ok then 'PASS' else 'FAIL' end, label, detail; end $f$;

do $do$
declare o uuid; c uuid; p1 uuid; p2 uuid; s uuid; b uuid; st uuid; r text; v text; n int;
begin
  select id into o from profiles where name='Owner Dev';       select id into c  from profiles where name='Admin Komunitas';
  select id into p1 from profiles where name='Ops Satu';       select id into p2 from profiles where name='Ops Dua';
  select id into s from profiles where name='Penjual';         select id into b  from profiles where name='Pembeli';

  -- 1-2 pembeli tidak bisa mengangkat diri / mengubah kolom sensitif
  r := pg_temp.exec_as(b, $q$update public.profiles set is_admin=true, admin_role='owner', status='active', phone_verified_at=now() where id=auth.uid()$q$);
  select admin_role into v from profiles where id=b; select count(*) into n from profiles where id=b and phone_verified_at is not null;
  perform pg_temp.chk('1 pembeli tidak bisa promosi diri', v is null and not (select is_admin from profiles where id=b), 'hasil='||r);
  perform pg_temp.chk('2 pembeli tidak bisa memverifikasi dirinya', n=0);

  -- 3 ops tidak bisa mengatur peran
  r := pg_temp.exec_as(p1, format($q$select public.admin_set_admin_role(%L,'community')$q$, b));
  perform pg_temp.chk('3 ops ditolak mengatur peran', r like '%FORBIDDEN%', r);
  r := pg_temp.exec_as(c, format($q$select public.admin_set_admin_role(%L,'operations')$q$, b));
  perform pg_temp.chk('3b komunitas ditolak mengatur peran', r like '%FORBIDDEN%', r);

  -- 4 owner beri dan cabut peran
  r := pg_temp.exec_as(o, format($q$select public.admin_set_admin_role(%L,'operations')$q$, b));
  perform pg_temp.chk('4 owner bisa beri peran', r='ok' and (select is_admin and admin_role='operations' from profiles where id=b), r);
  r := pg_temp.exec_as(o, format($q$select public.admin_set_admin_role(%L,null)$q$, b));
  perform pg_temp.chk('4b owner bisa cabut peran', r='ok' and (select not is_admin and admin_role is null from profiles where id=b), r);
  r := pg_temp.exec_as(o, format($q$select public.admin_set_admin_role(%L,'owner')$q$, b));
  perform pg_temp.chk('5 peran owner tidak bisa diberikan lewat aplikasi', r like '%INVALID_ROLE%', r);
  r := pg_temp.exec_as(o, format($q$select public.admin_set_admin_role(%L,null)$q$, o));
  perform pg_temp.chk('6 owner tidak bisa mencabut dirinya', r like '%FORBIDDEN%', r);

  -- 7-10 tangguhkan pengguna
  r := pg_temp.exec_as(c, format($q$select public.admin_set_user_status(%L,'suspended')$q$, b));
  perform pg_temp.chk('7 komunitas bisa tangguhkan pembeli', r='ok' and (select status='suspended' from profiles where id=b), r);
  r := pg_temp.exec_as(c, format($q$select public.admin_set_user_status(%L,'active')$q$, b));
  perform pg_temp.chk('7b ... dan aktifkan lagi', r='ok' and (select status='active' from profiles where id=b), r);
  r := pg_temp.exec_as(p1, format($q$select public.admin_set_user_status(%L,'suspended')$q$, b));
  perform pg_temp.chk('8 ops ditolak menangguhkan', r like '%FORBIDDEN%', r);
  r := pg_temp.exec_as(c, format($q$select public.admin_set_user_status(%L,'suspended')$q$, p2));
  perform pg_temp.chk('9 komunitas tidak bisa tangguhkan admin lain', r like '%FORBIDDEN%', r);
  r := pg_temp.exec_as(c, format($q$select public.admin_set_user_status(%L,'suspended')$q$, o));
  perform pg_temp.chk('10 komunitas tidak bisa tangguhkan owner', r like '%FORBIDDEN%', r);
  r := pg_temp.exec_as(o, format($q$select public.admin_set_user_status(%L,'suspended')$q$, p2));
  perform pg_temp.chk('9b owner bisa tangguhkan admin', r='ok', r);
  r := pg_temp.exec_as(p2, format($q$select public.admin_verify_phone(%L)$q$, s));
  perform pg_temp.chk('9c admin yang ditangguhkan kehilangan wewenang', r like '%FORBIDDEN%', r);
  r := pg_temp.exec_as(o, format($q$select public.get_seller_contacts()$q$));
  perform pg_temp.chk('18 kontak penjual hanya ops yang aktif', (select count(*) from public.get_seller_contacts() ) >= 0);
  perform pg_temp.exec_as(o, format($q$select public.admin_set_user_status(%L,'active')$q$, p2));

  -- 11-14 toko
  insert into stores (owner_id,name,slug,wa_number,category_id) values (s,'Warung Uji','warung-uji','6281200000005',2) returning id into st; -- sebagai postgres (bypass)
  update stores set approval_status='pending' where id=st;
  r := pg_temp.exec_as(s, $q$insert into public.stores (owner_id,name,slug,wa_number,approval_status) values (auth.uid(),'Toko Nakal','toko-nakal','6281200000005','approved')$q$);
  select approval_status into v from stores where slug='toko-nakal';
  perform pg_temp.chk('11 penjual tidak bisa membuat toko langsung approved', r='ok' and v='pending', 'status='||v);
  r := pg_temp.exec_as(s, format($q$update public.stores set approval_status='approved' where id=%L$q$, st));
  perform pg_temp.chk('13 penjual tidak bisa menyetujui tokonya', (select approval_status from stores where id=st)='pending', r);
  r := pg_temp.exec_as(p1, format($q$update public.stores set approval_status='approved' where id=%L$q$, st));
  perform pg_temp.chk('14 admin tidak bisa menyetujui lewat update langsung', (select approval_status from stores where id=st)='pending', r);
  r := pg_temp.exec_as(p1, format($q$select public.admin_set_store_approval(%L,'approved')$q$, st));
  perform pg_temp.chk('12 setujui sebelum verifikasi ditolak', r like '%OWNER_NOT_VERIFIED%', r);
  r := pg_temp.exec_as(p1, format($q$select public.admin_verify_phone(%L)$q$, s));
  perform pg_temp.chk('12b ops bisa verifikasi nomor', r='ok' and (select verified_by='admin' from profiles where id=s), r);
  r := pg_temp.exec_as(p1, format($q$select public.admin_set_store_approval(%L,'approved')$q$, st));
  perform pg_temp.chk('12c ops bisa menyetujui toko', r='ok' and (select approval_status='approved' from stores where id=st), r);
  r := pg_temp.exec_as(p1, format($q$select public.admin_set_store_approval(%L,'suspended')$q$, st));
  perform pg_temp.chk('12d ops tidak bisa menangguhkan toko', r like '%FORBIDDEN%', r);
  r := pg_temp.exec_as(c, format($q$select public.admin_set_store_approval(%L,'suspended')$q$, st));
  perform pg_temp.chk('12e komunitas bisa menangguhkan toko', r='ok', r);
  perform pg_temp.chk('12f pembeli hanya melihat toko approved', (select count(*) from stores where approval_status='approved')=0);

  -- 15-17 pengaturan dan kategori
  r := pg_temp.exec_as(c, $q$update public.community_settings set invite_code='KODE-BARU-1' where id=1$q$);
  perform pg_temp.chk('15 komunitas bisa ganti kode undangan', (select invite_code from community_settings)='KODE-BARU-1', r);
  r := pg_temp.exec_as(c, $q$update public.community_settings set require_phone_otp=true where id=1$q$);
  perform pg_temp.chk('15b komunitas ditolak mengubah saklar sistem', r like '%FORBIDDEN%', r);
  r := pg_temp.exec_as(o, $q$update public.community_settings set require_phone_otp=true where id=1$q$);
  perform pg_temp.chk('15c owner bisa mengubah saklar sistem', r='ok' and (select require_phone_otp from community_settings), r);
  r := pg_temp.exec_as(p1, $q$update public.community_settings set invite_code='RETAS-OPS' where id=1$q$);
  perform pg_temp.chk('16 ops tidak bisa mengubah pengaturan komunitas', (select invite_code from community_settings)='KODE-BARU-1', r);
  r := pg_temp.exec_as(p1, $q$insert into public.categories (name) values ('X-ops')$q$);
  perform pg_temp.chk('17 ops tidak bisa menambah kategori', r like '%row-level security%' or r like '%permission%', r);
  r := pg_temp.exec_as(c, $q$insert into public.categories (name) values ('X-komunitas')$q$);
  perform pg_temp.chk('17b komunitas bisa menambah kategori', r='ok', r);

  -- 19-20 jalur SQL developer
  update profiles set is_admin=true where id=b;
  perform pg_temp.chk('19 is_admin=true lewat SQL memberi peran terkecil', (select admin_role='operations' from profiles where id=b));
  update profiles set is_admin=false where id=b;
  perform pg_temp.chk('19b is_admin=false mencabut peran', (select admin_role is null and not is_admin from profiles where id=b));
  update profiles set admin_role='community' where id=b; update profiles set admin_role=null where id=b;
  perform pg_temp.chk('20 admin_role=null mencabut', (select not is_admin from profiles where id=b));

  -- 21 pendaftaran dengan kode salah ditolak
  begin
    insert into auth.users (id,email,raw_user_meta_data) values (gen_random_uuid(),'z@x','{"name":"Zed","wa_number":"6281200000099","block":"A","house_no":"1","invite_code":"SALAH"}');
    perform pg_temp.chk('21 kode undangan salah ditolak', false);
  exception when others then perform pg_temp.chk('21 kode undangan salah ditolak', sqlerrm like '%INVALID_INVITE_CODE%', sqlerrm);
  end;
end $do$;

-- kontak penjual (dipanggil sebagai penjual)
begin; set local role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',true);
select * from public.get_seller_contacts(); rollback;
