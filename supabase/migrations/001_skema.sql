-- =====================================================================
-- RUANG PREDIKSI - Migrasi 001: skema, RLS, dan fungsi dasar
-- Jalankan SEKALI di Supabase > SQL Editor > New query > Run.
-- Aman dijalankan ulang (memakai IF NOT EXISTS / DROP POLICY IF EXISTS).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. PROFIL
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nama        text,
  email       text,
  foto_url    text,
  peran       text not null default 'peserta' check (peran in ('peserta', 'admin')),
  dibuat_pada timestamptz not null default now()
);

-- Cek admin. SECURITY DEFINER agar bisa dipakai di dalam policy tanpa rekursi.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and peran = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Profil dibuat/diperbarui otomatis saat login Google. Kolom "peran" tidak disentuh.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nama, email, foto_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do update
    set nama     = excluded.nama,
        email    = excluded.email,
        foto_url = excluded.foto_url;
  return new;
end;
$$;

drop trigger if exists on_auth_user_upsert on auth.users;
create trigger on_auth_user_upsert
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute function public.handle_new_user();

-- Isi profil untuk akun yang sudah ada sebelum trigger dibuat.
insert into public.profiles (id, nama, email, foto_url)
select u.id,
       coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
       u.email,
       coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 2. KATEGORI, UJIAN, SOAL
-- ---------------------------------------------------------------------
create table if not exists public.kategori (
  id           uuid primary key default gen_random_uuid(),
  nama         text not null,
  tahun_ajaran text,
  deskripsi    text,
  status       text not null default 'draf' check (status in ('draf', 'terbit', 'arsip')),
  dibuat_pada  timestamptz not null default now(),
  diubah_pada  timestamptz not null default now()
);

create table if not exists public.ujian (
  id                uuid primary key default gen_random_uuid(),
  kategori_id       uuid not null references public.kategori(id) on delete restrict,
  judul             text not null,
  deskripsi         text,
  durasi_menit      integer not null default 60 check (durasi_menit between 1 and 600),
  aturan_satu_kode  boolean not null default true,
  kunci_pelanggaran boolean not null default false,
  status            text not null default 'draf' check (status in ('draf', 'terbit', 'arsip')),
  dibuat_pada       timestamptz not null default now(),
  diubah_pada       timestamptz not null default now()
);
create index if not exists ujian_kategori_idx on public.ujian(kategori_id);

create table if not exists public.soal (
  id            uuid primary key default gen_random_uuid(),
  ujian_id      uuid not null references public.ujian(id) on delete cascade,
  nomor         integer not null check (nomor > 0),
  jenis         text not null check (jenis in ('pilihan_ganda', 'isian', 'esai')),
  teks          text not null,
  opsi          jsonb not null default '[]'::jsonb,          -- [{"kode":"A","teks":"..."}]
  kunci         text,                                         -- "A", "B", ... (pilihan ganda)
  jawaban_isian jsonb not null default '[]'::jsonb,          -- ["jakarta","dki jakarta"]
  bobot         numeric(6, 2) not null default 1 check (bobot > 0),
  rubrik        text,
  pembahasan    text,
  dibuat_pada   timestamptz not null default now(),
  diubah_pada   timestamptz not null default now(),
  -- DEFERRABLE: nomor boleh bertukar dalam satu transaksi (geser urutan).
  constraint soal_nomor_unik unique (ujian_id, nomor) deferrable initially deferred
);

-- Perbarui kolom diubah_pada otomatis.
create or replace function public.set_diubah_pada()
returns trigger
language plpgsql
as $$
begin
  new.diubah_pada = now();
  return new;
end;
$$;

drop trigger if exists kategori_diubah on public.kategori;
create trigger kategori_diubah before update on public.kategori
  for each row execute function public.set_diubah_pada();
drop trigger if exists ujian_diubah on public.ujian;
create trigger ujian_diubah before update on public.ujian
  for each row execute function public.set_diubah_pada();
drop trigger if exists soal_diubah on public.soal;
create trigger soal_diubah before update on public.soal
  for each row execute function public.set_diubah_pada();

-- Susun ulang nomor soal sesuai urutan array id (1, 2, 3, ...). Hanya admin.
-- Berjalan sebagai pemanggil (security invoker) sehingga RLS tetap berlaku.
create or replace function public.urutkan_soal(p_ujian uuid, p_ids uuid[])
returns void
language plpgsql
as $$
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh mengurutkan soal.';
  end if;

  update public.soal s
     set nomor = x.n
    from (select t.id, t.ord::integer as n
            from unnest(p_ids) with ordinality as t(id, ord)) x
   where s.id = x.id
     and s.ujian_id = p_ujian;
end;
$$;

revoke all on function public.urutkan_soal(uuid, uuid[]) from public;
grant execute on function public.urutkan_soal(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------
-- 3. KODE UJIAN DAN PEMAKAIAN (dipakai penuh mulai Batch 2)
-- ---------------------------------------------------------------------
create table if not exists public.kode_ujian (
  id          uuid primary key default gen_random_uuid(),
  ujian_id    uuid not null references public.ujian(id) on delete cascade,
  -- 8 karakter: A-Z dan 2-9, tanpa 0, 1, O, I, L (31 karakter)
  kode        text not null unique check (kode ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{8}$'),
  kuota       integer not null default 3 check (kuota >= 1),
  dibuat_oleh uuid references public.profiles(id) on delete set null,
  status      text not null default 'aktif' check (status in ('aktif', 'dicabut')),
  dibuat_pada timestamptz not null default now()
);
create index if not exists kode_ujian_ujian_idx on public.kode_ujian(ujian_id);

create table if not exists public.pemakaian_kode (
  id             uuid primary key default gen_random_uuid(),
  kode_ujian_id  uuid not null references public.kode_ujian(id) on delete restrict,
  ujian_id       uuid not null references public.ujian(id) on delete restrict,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  mulai_pada     timestamptz not null default now(),
  selesai_pada   timestamptz,
  status         text not null default 'berjalan'
                   check (status in ('berjalan', 'selesai', 'dikunci', 'waktu_habis')),
  skor           numeric(5, 2),
  jumlah_benar   integer not null default 0,
  pelanggaran    integer not null default 0,
  -- Tidak boleh memakai kode yang sama dua kali.
  constraint pemakaian_kode_user_unik unique (kode_ujian_id, user_id)
);
create index if not exists pemakaian_user_idx on public.pemakaian_kode(user_id);
create index if not exists pemakaian_ujian_idx on public.pemakaian_kode(ujian_id);
-- Satu akun hanya boleh punya satu sesi berjalan.
create unique index if not exists pemakaian_satu_sesi_berjalan
  on public.pemakaian_kode(user_id) where status = 'berjalan';

-- Aturan "satu kode per ujian" bersifat per ujian (bisa dimatikan admin),
-- jadi dijaga lewat trigger, bukan unique index tabel.
create or replace function public.cek_satu_kode_per_ujian()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aturan boolean;
begin
  select aturan_satu_kode into v_aturan from public.ujian where id = new.ujian_id;
  if coalesce(v_aturan, true) and exists (
    select 1 from public.pemakaian_kode
     where ujian_id = new.ujian_id and user_id = new.user_id
  ) then
    raise exception 'SUDAH_PAKAI_KODE_LAIN' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists pemakaian_cek_satu_kode on public.pemakaian_kode;
create trigger pemakaian_cek_satu_kode before insert on public.pemakaian_kode
  for each row execute function public.cek_satu_kode_per_ujian();

-- ---------------------------------------------------------------------
-- 4. JAWABAN, NILAI ESAI, LOG
-- ---------------------------------------------------------------------
create table if not exists public.jawaban (
  id           uuid primary key default gen_random_uuid(),
  pemakaian_id uuid not null references public.pemakaian_kode(id) on delete cascade,
  soal_id      uuid not null references public.soal(id) on delete restrict,
  pilihan      text,
  nilai        numeric(6, 2),
  dijawab_pada timestamptz not null default now(),
  constraint jawaban_unik unique (pemakaian_id, soal_id)
);

create table if not exists public.nilai_esai (
  id           uuid primary key default gen_random_uuid(),
  jawaban_id   uuid not null unique references public.jawaban(id) on delete cascade,
  nilai        numeric(6, 2) not null check (nilai >= 0),
  komentar     text,
  dinilai_oleh uuid references public.profiles(id) on delete set null,
  dinilai_pada timestamptz not null default now()
);

create table if not exists public.log_pelanggaran (
  id           uuid primary key default gen_random_uuid(),
  pemakaian_id uuid not null references public.pemakaian_kode(id) on delete cascade,
  jenis        text not null,
  dicatat_pada timestamptz not null default now()
);
create index if not exists log_pelanggaran_pemakaian_idx on public.log_pelanggaran(pemakaian_id);

create table if not exists public.log_admin (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid references public.profiles(id) on delete set null,
  sasaran_id  uuid,
  aksi        text not null,
  nilai       jsonb not null default '{}'::jsonb,
  alasan      text,
  dibuat_pada timestamptz not null default now()
);
create index if not exists log_admin_waktu_idx on public.log_admin(dibuat_pada desc);

-- ---------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- Prinsip: peserta hanya membaca data miliknya. Soal, kunci, dan kode
-- TIDAK bisa dibaca peserta; penulisan data peserta lewat server.
-- ---------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.kategori        enable row level security;
alter table public.ujian           enable row level security;
alter table public.soal            enable row level security;
alter table public.kode_ujian      enable row level security;
alter table public.pemakaian_kode  enable row level security;
alter table public.jawaban         enable row level security;
alter table public.nilai_esai      enable row level security;
alter table public.log_pelanggaran enable row level security;
alter table public.log_admin       enable row level security;

-- profiles
drop policy if exists profiles_baca on public.profiles;
create policy profiles_baca on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- kategori
drop policy if exists kategori_baca_terbit on public.kategori;
create policy kategori_baca_terbit on public.kategori for select to authenticated
  using (status = 'terbit');
drop policy if exists kategori_admin on public.kategori;
create policy kategori_admin on public.kategori for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ujian
drop policy if exists ujian_baca_terbit on public.ujian;
create policy ujian_baca_terbit on public.ujian for select to authenticated
  using (status = 'terbit');
drop policy if exists ujian_admin on public.ujian;
create policy ujian_admin on public.ujian for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- soal: hanya admin (peserta mengambil soal lewat fungsi server)
drop policy if exists soal_admin on public.soal;
create policy soal_admin on public.soal for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- kode_ujian: hanya admin
drop policy if exists kode_admin on public.kode_ujian;
create policy kode_admin on public.kode_ujian for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- pemakaian_kode: peserta membaca miliknya; admin membaca semua dan boleh menghapus (reset)
drop policy if exists pemakaian_baca on public.pemakaian_kode;
create policy pemakaian_baca on public.pemakaian_kode for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists pemakaian_admin_hapus on public.pemakaian_kode;
create policy pemakaian_admin_hapus on public.pemakaian_kode for delete to authenticated
  using (public.is_admin());

-- jawaban: peserta baru boleh membaca SETELAH sesinya selesai (agar benar/salah tidak bocor saat ujian)
drop policy if exists jawaban_baca on public.jawaban;
create policy jawaban_baca on public.jawaban for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.pemakaian_kode p
       where p.id = jawaban.pemakaian_id
         and p.user_id = auth.uid()
         and p.status <> 'berjalan'
    )
  );

-- nilai_esai: admin penuh; peserta membaca miliknya setelah sesi selesai
drop policy if exists nilai_esai_admin on public.nilai_esai;
create policy nilai_esai_admin on public.nilai_esai for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists nilai_esai_baca_peserta on public.nilai_esai;
create policy nilai_esai_baca_peserta on public.nilai_esai for select to authenticated
  using (
    exists (
      select 1
        from public.jawaban j
        join public.pemakaian_kode p on p.id = j.pemakaian_id
       where j.id = nilai_esai.jawaban_id
         and p.user_id = auth.uid()
         and p.status <> 'berjalan'
    )
  );

-- log_pelanggaran: peserta membaca miliknya; admin semua
drop policy if exists log_pelanggaran_baca on public.log_pelanggaran;
create policy log_pelanggaran_baca on public.log_pelanggaran for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.pemakaian_kode p
       where p.id = log_pelanggaran.pemakaian_id and p.user_id = auth.uid()
    )
  );

-- log_admin: admin membaca dan menambah (atas namanya sendiri)
drop policy if exists log_admin_baca on public.log_admin;
create policy log_admin_baca on public.log_admin for select to authenticated
  using (public.is_admin());
drop policy if exists log_admin_tambah on public.log_admin;
create policy log_admin_tambah on public.log_admin for insert to authenticated
  with check (public.is_admin() and admin_id = auth.uid());

-- ---------------------------------------------------------------------
-- 6. MENJADIKAN DIRI SENDIRI ADMIN (jalankan SETELAH login Google pertama)
-- Ganti email, lalu jalankan baris ini sendiri:
--
--   update public.profiles set peran = 'admin' where email = 'emailmu@gmail.com';
--
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- 6. IZIN TABEL
-- Project Supabase baru tidak lagi memberi izin otomatis ke role
-- "authenticated". Izin ini hanya membuka pintu tabel; baris yang boleh
-- dibaca/diubah tetap dibatasi kebijakan RLS di atas.
-- ---------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.profiles,
  public.kategori,
  public.ujian,
  public.soal,
  public.kode_ujian,
  public.pemakaian_kode,
  public.jawaban,
  public.nilai_esai,
  public.log_pelanggaran,
  public.log_admin
to authenticated;
