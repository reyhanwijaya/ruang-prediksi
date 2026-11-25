-- =====================================================================
-- RUANG PREDIKSI - Migrasi 002: kode ujian, sesi ujian, penilaian dasar, gambar soal
-- Jalankan SEKALI di Supabase > SQL Editor SETELAH 001_skema.sql.
-- Aman dijalankan ulang.
--
-- Semua logika ujian ada di fungsi SECURITY DEFINER yang memeriksa auth.uid().
-- Peserta TIDAK membaca tabel soal/kode secara langsung; kunci jawaban tidak
-- pernah dikirim ke browser selama sesi berjalan.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PERUBAHAN TABEL
-- ---------------------------------------------------------------------
-- Sesi dibuat saat kode dipakai, timer baru jalan saat peserta menekan "Mulai".
alter table public.pemakaian_kode alter column mulai_pada drop not null;
alter table public.pemakaian_kode alter column mulai_pada drop default;
alter table public.pemakaian_kode add column if not exists dibuat_pada timestamptz not null default now();

-- Gambar pada soal (opsi menyimpan gambarnya di dalam jsonb opsi).
alter table public.soal add column if not exists gambar_url text;

-- Catatan percobaan kode yang gagal (untuk rate limit).
create table if not exists public.percobaan_kode (
  id          bigserial primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  dicoba_pada timestamptz not null default now()
);
create index if not exists percobaan_kode_idx on public.percobaan_kode(user_id, dicoba_pada desc);
alter table public.percobaan_kode enable row level security;
-- sengaja tanpa policy: hanya fungsi di bawah yang boleh menyentuhnya

-- ---------------------------------------------------------------------
-- 2. FUNGSI BANTU (internal)
-- ---------------------------------------------------------------------
-- Normalisasi jawaban isian: huruf kecil, spasi berlebih dirapikan.
create or replace function public._norm(t text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(btrim(coalesce(t, ''))), '\s+', ' ', 'g');
$$;

-- Satu kode 8 karakter dari alfabet 31 huruf/angka, memakai sumber acak kriptografis.
-- Byte >= 248 dibuang (248 = 31 x 8) agar semua karakter berpeluang sama.
create or replace function public._acak_kode()
returns text
language plpgsql
volatile
set search_path = public, extensions
as $$
declare
  alfabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  hasil   text := '';
  b       bytea;
  v       integer;
  i       integer;
begin
  while length(hasil) < 8 loop
    b := gen_random_bytes(16);
    for i in 0..15 loop
      v := get_byte(b, i);
      if v < 248 then
        hasil := hasil || substr(alfabet, (v % 31) + 1, 1);
        exit when length(hasil) = 8;
      end if;
    end loop;
  end loop;
  return hasil;
end;
$$;

-- Ringkasan hasil sesi.
create or replace function public._hasil(p_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'status', p.status,
    'skor', p.skor,
    'jumlah_benar', p.jumlah_benar,
    'pelanggaran', p.pelanggaran,
    'menunggu_esai', (p.status <> 'berjalan' and p.skor is null),
    'jumlah_soal', (select count(*) from public.soal s where s.ujian_id = p.ujian_id)
  )
  from public.pemakaian_kode p
  where p.id = p_id;
$$;

-- Hitung ulang nilai tiap jawaban dan skor sesi.
-- Skor = (bobot yang benar / total bobot) x 100, dibulatkan.
-- Jika ada esai yang sudah dijawab tetapi belum dinilai admin, skor = NULL ("menunggu nilai esai").
-- Dipakai juga oleh penilaian esai di Tahap 6.
create or replace function public._hitung_skor(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  p        public.pemakaian_kode%rowtype;
  s        record;
  j        public.jawaban%rowtype;
  v_total  numeric := 0;
  v_dapat  numeric := 0;
  v_benar  integer := 0;
  v_tunggu boolean := false;
  v_ok     boolean;
  v_esai   numeric;
begin
  select * into p from public.pemakaian_kode where id = p_id;
  if not found then
    return;
  end if;

  for s in
    select id, jenis, kunci, jawaban_isian, bobot
      from public.soal
     where ujian_id = p.ujian_id
  loop
    v_total := v_total + s.bobot;

    select * into j from public.jawaban where pemakaian_id = p_id and soal_id = s.id;
    if not found then
      continue;
    end if;

    if s.jenis = 'pilihan_ganda' then
      v_ok := upper(coalesce(j.pilihan, '')) = coalesce(s.kunci, '#');
      update public.jawaban set nilai = case when v_ok then s.bobot else 0 end where id = j.id;
      if v_ok then
        v_dapat := v_dapat + s.bobot;
        v_benar := v_benar + 1;
      end if;

    elsif s.jenis = 'isian' then
      v_ok := exists (
        select 1
          from jsonb_array_elements_text(s.jawaban_isian) as v(t)
         where public._norm(v.t) = public._norm(j.pilihan)
      );
      update public.jawaban set nilai = case when v_ok then s.bobot else 0 end where id = j.id;
      if v_ok then
        v_dapat := v_dapat + s.bobot;
        v_benar := v_benar + 1;
      end if;

    else -- esai
      if btrim(coalesce(j.pilihan, '')) = '' then
        continue;
      end if;
      select ne.nilai into v_esai from public.nilai_esai ne where ne.jawaban_id = j.id;
      if found then
        v_dapat := v_dapat + least(v_esai, s.bobot);
      else
        v_tunggu := true;
      end if;
    end if;
  end loop;

  update public.pemakaian_kode
     set jumlah_benar = v_benar,
         skor = case
                  when v_tunggu then null
                  when v_total > 0 then round(v_dapat / v_total * 100)
                  else 0
                end
   where id = p_id;
end;
$$;

-- Menutup sesi (selesai / waktu_habis / dikunci) lalu menilai.
create or replace function public._tutup_sesi(p_id uuid, p_status text, p_selesai timestamptz default now())
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.pemakaian_kode
     set status = p_status, selesai_pada = p_selesai
   where id = p_id and status = 'berjalan';
  if found then
    perform public._hitung_skor(p_id);
  end if;
end;
$$;

-- Tutup semua sesi yang waktunya sudah lewat (toleransi 5 detik untuk jaringan lambat).
create or replace function public._tutup_kadaluarsa(p_user uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select p.id, p.mulai_pada + make_interval(mins => u.durasi_menit) as batas
      from public.pemakaian_kode p
      join public.ujian u on u.id = p.ujian_id
     where p.status = 'berjalan'
       and p.mulai_pada is not null
       and (p_user is null or p.user_id = p_user)
       and now() > p.mulai_pada + make_interval(mins => u.durasi_menit) + interval '5 seconds'
  loop
    perform public._tutup_sesi(r.id, 'waktu_habis', r.batas);
  end loop;
end;
$$;

-- Pemeriksaan umum: sesi milik pemanggil, masih berjalan, sudah dimulai, belum habis.
-- NULL = boleh lanjut; selain itu objek galat siap dikirim ke klien.
create or replace function public._sesi_aktif(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p       public.pemakaian_kode%rowtype;
  v_dur   integer;
  v_batas timestamptz;
begin
  select * into p from public.pemakaian_kode where id = p_id and user_id = auth.uid();
  if not found then
    return jsonb_build_object('ok', false, 'kode', 'tidak_ada', 'pesan', 'Sesi ujian tidak ditemukan.');
  end if;

  if p.status <> 'berjalan' then
    return jsonb_build_object('ok', false, 'kode', 'selesai', 'pesan', 'Sesi ujian sudah berakhir.',
                              'hasil', public._hasil(p_id));
  end if;

  if p.mulai_pada is null then
    return jsonb_build_object('ok', false, 'kode', 'belum_mulai', 'pesan', 'Ujian belum dimulai.');
  end if;

  select durasi_menit into v_dur from public.ujian where id = p.ujian_id;
  v_batas := p.mulai_pada + make_interval(mins => v_dur);

  if now() > v_batas + interval '5 seconds' then
    perform public._tutup_sesi(p_id, 'waktu_habis', v_batas);
    return jsonb_build_object('ok', false, 'kode', 'waktu_habis', 'pesan', 'Waktu ujian sudah habis.',
                              'hasil', public._hasil(p_id));
  end if;

  return null;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. KODE UJIAN (admin)
-- ---------------------------------------------------------------------
-- Membuat banyak kode sekaligus untuk satu ujian. Mengembalikan daftar kode.
create or replace function public.buat_kode(p_ujian uuid, p_jumlah integer, p_kuota integer default 3)
returns setof text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  n    integer := 0;
  coba integer := 0;
  k    text;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh membuat kode.';
  end if;
  if p_jumlah < 1 or p_jumlah > 100 then
    raise exception 'Jumlah kode harus antara 1 dan 100.';
  end if;
  if p_kuota < 1 or p_kuota > 1000 then
    raise exception 'Kuota harus antara 1 dan 1000.';
  end if;
  if not exists (select 1 from public.ujian where id = p_ujian) then
    raise exception 'Ujian tidak ditemukan.';
  end if;

  while n < p_jumlah loop
    coba := coba + 1;
    if coba > p_jumlah * 20 then
      raise exception 'Gagal membuat kode unik. Coba lagi.';
    end if;

    k := public._acak_kode();
    begin
      insert into public.kode_ujian (ujian_id, kode, kuota, dibuat_oleh)
      values (p_ujian, k, p_kuota, auth.uid());
      n := n + 1;
      return next k;
    exception when unique_violation then
      null; -- kode bentrok, ulangi
    end;
  end loop;
end;
$$;

create or replace function public.tutup_kadaluarsa_semua()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Hanya admin.';
  end if;
  perform public._tutup_kadaluarsa(null);
end;
$$;

-- ---------------------------------------------------------------------
-- 4. MEMAKAI KODE (peserta)
-- ---------------------------------------------------------------------
create or replace function public.pakai_kode(p_kode text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid     uuid := auth.uid();
  v_kode  text := upper(btrim(coalesce(p_kode, '')));
  kd      public.kode_ujian%rowtype;
  uj      public.ujian%rowtype;
  ada     public.pemakaian_kode%rowtype;
  v_gagal integer;
  v_pakai integer;
  v_baru  uuid;
  v_jalan uuid;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'kode', 'belum_login', 'pesan', 'Silakan masuk terlebih dahulu.');
  end if;

  perform public._tutup_kadaluarsa(uid);
  delete from public.percobaan_kode where dicoba_pada < now() - interval '1 day';

  -- Rate limit: maksimal 8 percobaan gagal per 10 menit.
  select count(*) into v_gagal
    from public.percobaan_kode
   where user_id = uid and dicoba_pada > now() - interval '10 minutes';
  if v_gagal >= 8 then
    return jsonb_build_object('ok', false, 'kode', 'terlalu_banyak',
                              'pesan', 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.');
  end if;

  -- Kunci baris kode agar penghitungan kuota tidak bisa "kebobolan" oleh dua permintaan bersamaan.
  select * into kd from public.kode_ujian where kode = v_kode for update;
  if not found then
    insert into public.percobaan_kode (user_id) values (uid);
    return jsonb_build_object('ok', false, 'kode', 'tidak_ditemukan',
                              'pesan', 'Kode tidak ditemukan. Periksa kembali huruf dan angkanya.');
  end if;

  select * into uj from public.ujian where id = kd.ujian_id;

  -- Kode yang sama sudah pernah dipakai orang ini?
  select * into ada from public.pemakaian_kode where kode_ujian_id = kd.id and user_id = uid;
  if found then
    if ada.status = 'berjalan' then
      -- sesi berjalan tidak terganggu walau kode dicabut: boleh dilanjutkan
      return jsonb_build_object('ok', true, 'pemakaian_id', ada.id, 'lanjut', true);
    end if;
    return jsonb_build_object('ok', false, 'kode', 'tidak_bisa', 'pesan', 'Kode ini sudah tidak bisa dipakai.');
  end if;

  select count(*) into v_pakai from public.pemakaian_kode where kode_ujian_id = kd.id;
  if kd.status <> 'aktif' or uj.status <> 'terbit' or v_pakai >= kd.kuota then
    insert into public.percobaan_kode (user_id) values (uid);
    return jsonb_build_object('ok', false, 'kode', 'tidak_bisa', 'pesan', 'Kode ini sudah tidak bisa dipakai.');
  end if;

  if uj.aturan_satu_kode and exists (
    select 1 from public.pemakaian_kode where ujian_id = uj.id and user_id = uid
  ) then
    return jsonb_build_object('ok', false, 'kode', 'sudah_pakai_lain',
                              'pesan', 'Anda sudah memakai kode lain untuk ujian ini.');
  end if;

  select id into v_jalan from public.pemakaian_kode where user_id = uid and status = 'berjalan' limit 1;
  if v_jalan is not null then
    return jsonb_build_object('ok', false, 'kode', 'sesi_berjalan',
                              'pesan', 'Selesaikan ujian yang sedang berjalan terlebih dahulu.',
                              'pemakaian_id', v_jalan);
  end if;

  begin
    insert into public.pemakaian_kode (kode_ujian_id, ujian_id, user_id, status)
    values (kd.id, uj.id, uid, 'berjalan')
    returning id into v_baru;
  exception
    when unique_violation then
      return jsonb_build_object('ok', false, 'kode', 'sesi_berjalan',
                                'pesan', 'Selesaikan ujian yang sedang berjalan terlebih dahulu.');
    when raise_exception then
      return jsonb_build_object('ok', false, 'kode', 'sudah_pakai_lain',
                                'pesan', 'Anda sudah memakai kode lain untuk ujian ini.');
  end;

  return jsonb_build_object('ok', true, 'pemakaian_id', v_baru);
end;
$$;

-- Daftar kode yang pernah dipakai pemanggil (peserta tidak bisa membaca tabel kode langsung).
create or replace function public.kode_saya()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._tutup_kadaluarsa(auth.uid());
  return coalesce((
    select jsonb_agg(
             jsonb_build_object(
               'pemakaian_id', p.id,
               'kode', k.kode,
               'judul', u.judul,
               'status', p.status,
               'skor', p.skor,
               'mulai_pada', p.mulai_pada,
               'dibuat_pada', p.dibuat_pada
             )
             order by p.dibuat_pada desc
           )
      from public.pemakaian_kode p
      join public.kode_ujian k on k.id = p.kode_ujian_id
      join public.ujian u on u.id = p.ujian_id
     where p.user_id = auth.uid()
  ), '[]'::jsonb);
end;
$$;

create or replace function public.tutup_kadaluarsa_saya()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._tutup_kadaluarsa(auth.uid());
end;
$$;

-- ---------------------------------------------------------------------
-- 5. SESI UJIAN (peserta)
-- ---------------------------------------------------------------------
-- Data sesi untuk halaman ujian. Tidak berisi soal maupun kunci.
create or replace function public.ambil_sesi(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p         public.pemakaian_kode%rowtype;
  u         public.ujian%rowtype;
  v_batas   timestamptz;
  v_jawab   jsonb;
begin
  select * into p from public.pemakaian_kode where id = p_id and user_id = auth.uid();
  if not found then
    return jsonb_build_object('ok', false, 'kode', 'tidak_ada', 'pesan', 'Sesi ujian tidak ditemukan.');
  end if;

  select * into u from public.ujian where id = p.ujian_id;

  if p.status = 'berjalan' and p.mulai_pada is not null then
    v_batas := p.mulai_pada + make_interval(mins => u.durasi_menit);
    if now() > v_batas + interval '5 seconds' then
      perform public._tutup_sesi(p_id, 'waktu_habis', v_batas);
      select * into p from public.pemakaian_kode where id = p_id;
    end if;
  end if;

  select coalesce(jsonb_agg(s.nomor order by s.nomor), '[]'::jsonb)
    into v_jawab
    from public.jawaban j
    join public.soal s on s.id = j.soal_id
   where j.pemakaian_id = p_id;

  return jsonb_build_object(
    'ok', true,
    'sesi', jsonb_build_object(
      'id', p.id,
      'status', p.status,
      'judul', u.judul,
      'deskripsi', u.deskripsi,
      'durasi_menit', u.durasi_menit,
      'jumlah_soal', (select count(*) from public.soal where ujian_id = u.id),
      'mulai_pada', p.mulai_pada,
      'deadline', case when p.mulai_pada is null then null
                       else p.mulai_pada + make_interval(mins => u.durasi_menit) end,
      'server_now', now(),
      'pelanggaran', p.pelanggaran,
      'kunci_pelanggaran', u.kunci_pelanggaran,
      'nomor_terjawab', v_jawab,
      'hasil', case when p.status = 'berjalan' then null else public._hasil(p.id) end
    )
  );
end;
$$;

-- Peserta menekan "Mulai": timer server dimulai (hanya sekali).
create or replace function public.mulai_ujian(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.pemakaian_kode%rowtype;
begin
  select * into p from public.pemakaian_kode where id = p_id and user_id = auth.uid() for update;
  if not found then
    return jsonb_build_object('ok', false, 'kode', 'tidak_ada', 'pesan', 'Sesi ujian tidak ditemukan.');
  end if;

  if p.status = 'berjalan' and p.mulai_pada is null then
    update public.pemakaian_kode set mulai_pada = now() where id = p_id;
  end if;

  return public.ambil_sesi(p_id);
end;
$$;

-- Peserta membatalkan sesi yang BELUM dimulai (mis. salah memasukkan kode).
-- Baris pemakaian dihapus sehingga kuota kode kembali dan peserta bebas memakai kode lain.
create or replace function public.batalkan_sesi(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.pemakaian_kode
   where id = p_id
     and user_id = auth.uid()
     and status = 'berjalan'
     and mulai_pada is null;

  if not found then
    return jsonb_build_object('ok', false, 'kode', 'tidak_bisa',
                              'pesan', 'Sesi tidak bisa dibatalkan karena sudah dimulai.');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Mengambil satu soal (tanpa kunci).
create or replace function public.ambil_soal(p_id uuid, p_nomor integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_err jsonb;
  p     public.pemakaian_kode%rowtype;
  s     public.soal%rowtype;
  v_pil text;
begin
  v_err := public._sesi_aktif(p_id);
  if v_err is not null then
    return v_err;
  end if;

  select * into p from public.pemakaian_kode where id = p_id;
  select * into s from public.soal where ujian_id = p.ujian_id and nomor = p_nomor;
  if not found then
    return jsonb_build_object('ok', false, 'kode', 'soal_tidak_ada', 'pesan', 'Soal tidak ditemukan.');
  end if;

  select pilihan into v_pil from public.jawaban where pemakaian_id = p_id and soal_id = s.id;

  return jsonb_build_object(
    'ok', true,
    'soal', jsonb_build_object(
      'nomor', s.nomor,
      'jenis', s.jenis,
      'teks', s.teks,
      'gambar_url', s.gambar_url,
      'bobot', s.bobot,
      'opsi', s.opsi
    ),
    'jawaban', v_pil
  );
end;
$$;

-- Menyimpan jawaban satu soal. Jawaban kosong = menghapus jawaban.
-- Jawaban bisa diubah sampai sesi dikumpulkan / waktu habis.
create or replace function public.simpan_jawaban(p_id uuid, p_nomor integer, p_pilihan text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_err jsonb;
  p     public.pemakaian_kode%rowtype;
  s     public.soal%rowtype;
  v_pil text := coalesce(p_pilihan, '');
begin
  v_err := public._sesi_aktif(p_id);
  if v_err is not null then
    return v_err;
  end if;

  select * into p from public.pemakaian_kode where id = p_id;
  select * into s from public.soal where ujian_id = p.ujian_id and nomor = p_nomor;
  if not found then
    return jsonb_build_object('ok', false, 'kode', 'soal_tidak_ada', 'pesan', 'Soal tidak ditemukan.');
  end if;

  if length(v_pil) > 10000 then
    return jsonb_build_object('ok', false, 'kode', 'terlalu_panjang', 'pesan', 'Jawaban terlalu panjang.');
  end if;

  if s.jenis = 'pilihan_ganda' then
    if btrim(v_pil) <> '' and not exists (
      select 1 from jsonb_array_elements(s.opsi) o where o->>'kode' = upper(btrim(v_pil))
    ) then
      return jsonb_build_object('ok', false, 'kode', 'pilihan_tidak_valid', 'pesan', 'Pilihan tidak valid.');
    end if;
    v_pil := upper(btrim(v_pil));
  elsif s.jenis = 'isian' and length(v_pil) > 300 then
    return jsonb_build_object('ok', false, 'kode', 'terlalu_panjang', 'pesan', 'Jawaban isian terlalu panjang.');
  end if;

  if btrim(v_pil) = '' then
    delete from public.jawaban where pemakaian_id = p_id and soal_id = s.id;
  else
    insert into public.jawaban (pemakaian_id, soal_id, pilihan)
    values (p_id, s.id, v_pil)
    on conflict (pemakaian_id, soal_id)
    do update set pilihan = excluded.pilihan, dijawab_pada = now();
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- Mencatat pelanggaran. Kejadian dalam jendela 2 detik dihitung satu.
-- Jika ujian memakai kunci otomatis, sesi dikunci pada pelanggaran ke-3.
create or replace function public.catat_pelanggaran(p_id uuid, p_jenis text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_err jsonb;
  p     public.pemakaian_kode%rowtype;
  u     public.ujian%rowtype;
  v_n   integer;
begin
  if p_jenis not in ('keluar_fullscreen', 'pindah_tab', 'kehilangan_fokus') then
    return jsonb_build_object('ok', false, 'kode', 'jenis_tidak_valid', 'pesan', 'Jenis pelanggaran tidak valid.');
  end if;

  v_err := public._sesi_aktif(p_id);
  if v_err is not null then
    return v_err;
  end if;

  select * into p from public.pemakaian_kode where id = p_id for update;
  select * into u from public.ujian where id = p.ujian_id;

  if exists (
    select 1 from public.log_pelanggaran
     where pemakaian_id = p_id and dicatat_pada > now() - interval '2 seconds'
  ) then
    return jsonb_build_object('ok', true, 'dicatat', false, 'pelanggaran', p.pelanggaran, 'status', p.status);
  end if;

  insert into public.log_pelanggaran (pemakaian_id, jenis) values (p_id, p_jenis);
  update public.pemakaian_kode set pelanggaran = pelanggaran + 1 where id = p_id returning pelanggaran into v_n;

  if u.kunci_pelanggaran and v_n >= 3 then
    perform public._tutup_sesi(p_id, 'dikunci');
  end if;

  select * into p from public.pemakaian_kode where id = p_id;

  return jsonb_build_object(
    'ok', true,
    'dicatat', true,
    'pelanggaran', p.pelanggaran,
    'status', p.status,
    'hasil', case when p.status = 'berjalan' then null else public._hasil(p_id) end
  );
end;
$$;

-- Peserta menekan "Kumpulkan" (atau klien mengirim saat waktu habis).
create or replace function public.kumpulkan(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p       public.pemakaian_kode%rowtype;
  u       public.ujian%rowtype;
  v_batas timestamptz;
begin
  select * into p from public.pemakaian_kode where id = p_id and user_id = auth.uid() for update;
  if not found then
    return jsonb_build_object('ok', false, 'kode', 'tidak_ada', 'pesan', 'Sesi ujian tidak ditemukan.');
  end if;

  if p.status <> 'berjalan' then
    return jsonb_build_object('ok', true, 'hasil', public._hasil(p_id));
  end if;

  if p.mulai_pada is null then
    return jsonb_build_object('ok', false, 'kode', 'belum_mulai', 'pesan', 'Ujian belum dimulai.');
  end if;

  select * into u from public.ujian where id = p.ujian_id;
  v_batas := p.mulai_pada + make_interval(mins => u.durasi_menit);

  if now() > v_batas then
    perform public._tutup_sesi(p_id, 'waktu_habis', v_batas);
  else
    perform public._tutup_sesi(p_id, 'selesai');
  end if;

  return jsonb_build_object('ok', true, 'hasil', public._hasil(p_id));
end;
$$;

-- ---------------------------------------------------------------------
-- 6. HAK AKSES FUNGSI
-- Fungsi internal (awalan _) tidak bisa dipanggil dari browser.
-- ---------------------------------------------------------------------
revoke all on function public._norm(text)                                   from public, anon, authenticated;
revoke all on function public._acak_kode()                                  from public, anon, authenticated;
revoke all on function public._hasil(uuid)                                  from public, anon, authenticated;
revoke all on function public._hitung_skor(uuid)                            from public, anon, authenticated;
revoke all on function public._tutup_sesi(uuid, text, timestamptz)          from public, anon, authenticated;
revoke all on function public._tutup_kadaluarsa(uuid)                       from public, anon, authenticated;
revoke all on function public._sesi_aktif(uuid)                             from public, anon, authenticated;

revoke all on function public.buat_kode(uuid, integer, integer)             from public, anon;
revoke all on function public.tutup_kadaluarsa_semua()                      from public, anon;
revoke all on function public.pakai_kode(text)                              from public, anon;
revoke all on function public.kode_saya()                                   from public, anon;
revoke all on function public.tutup_kadaluarsa_saya()                       from public, anon;
revoke all on function public.ambil_sesi(uuid)                              from public, anon;
revoke all on function public.mulai_ujian(uuid)                             from public, anon;
revoke all on function public.batalkan_sesi(uuid)                           from public, anon;
revoke all on function public.ambil_soal(uuid, integer)                     from public, anon;
revoke all on function public.simpan_jawaban(uuid, integer, text)          from public, anon;
revoke all on function public.catat_pelanggaran(uuid, text)                 from public, anon;
revoke all on function public.kumpulkan(uuid)                               from public, anon;

grant execute on function public.buat_kode(uuid, integer, integer)         to authenticated;
grant execute on function public.tutup_kadaluarsa_semua()                  to authenticated;
grant execute on function public.pakai_kode(text)                          to authenticated;
grant execute on function public.kode_saya()                               to authenticated;
grant execute on function public.tutup_kadaluarsa_saya()                   to authenticated;
grant execute on function public.ambil_sesi(uuid)                          to authenticated;
grant execute on function public.mulai_ujian(uuid)                         to authenticated;
grant execute on function public.batalkan_sesi(uuid)                       to authenticated;
grant execute on function public.ambil_soal(uuid, integer)                 to authenticated;
grant execute on function public.simpan_jawaban(uuid, integer, text)      to authenticated;
grant execute on function public.catat_pelanggaran(uuid, text)             to authenticated;
grant execute on function public.kumpulkan(uuid)                           to authenticated;

-- ---------------------------------------------------------------------
-- 7. PENYIMPANAN GAMBAR SOAL
-- Bucket publik (nama file acak dan tidak bisa ditebak); hanya admin yang boleh
-- mengunggah/mengubah/menghapus. Maksimal 3 MB per gambar.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('soal-gambar', 'soal-gambar', true, 3145728,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists soal_gambar_baca on storage.objects;
create policy soal_gambar_baca on storage.objects for select to public
  using (bucket_id = 'soal-gambar');

drop policy if exists soal_gambar_tambah on storage.objects;
create policy soal_gambar_tambah on storage.objects for insert to authenticated
  with check (bucket_id = 'soal-gambar' and public.is_admin());

drop policy if exists soal_gambar_ubah on storage.objects;
create policy soal_gambar_ubah on storage.objects for update to authenticated
  using (bucket_id = 'soal-gambar' and public.is_admin());

drop policy if exists soal_gambar_hapus on storage.objects;
create policy soal_gambar_hapus on storage.objects for delete to authenticated
  using (bucket_id = 'soal-gambar' and public.is_admin());
