-- =====================================================================
-- Ruang Prediksi - Migrasi 004: ringkasan dashboard admin
-- Jalankan SETELAH 001, 002, 003. Aman dijalankan ulang.
-- =====================================================================

create or replace function public.dashboard_ringkasan(p_hari integer default 14)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hari   integer := least(greatest(coalesce(p_hari, 14), 1), 90);
  v_hari_ini date := (now() at time zone 'Asia/Jakarta')::date;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh melihat dashboard.' using errcode = '42501';
  end if;

  -- sesi yang waktunya habis ikut ditutup supaya angka akurat
  perform public._tutup_kadaluarsa(null);

  return jsonb_build_object(
    'ujian_aktif',
      (select count(*) from public.ujian where status = 'terbit'),
    'kode_aktif',
      (select count(*)
         from public.kode_ujian k
        where k.status = 'aktif'
          and (select count(*) from public.pemakaian_kode p where p.kode_ujian_id = k.id) < k.kuota),
    'pemakaian_hari_ini',
      (select count(*) from public.pemakaian_kode p
        where p.mulai_pada is not null
          and (p.mulai_pada at time zone 'Asia/Jakarta')::date = v_hari_ini),
    'rata_skor',
      (select round(avg(skor), 1) from public.pemakaian_kode where skor is not null),
    'esai_menunggu',
      (select count(*)
         from public.jawaban j
         join public.pemakaian_kode p on p.id = j.pemakaian_id
         join public.soal s on s.id = j.soal_id and s.jenis = 'esai'
         left join public.nilai_esai ne on ne.jawaban_id = j.id
        where p.status <> 'berjalan'
          and btrim(coalesce(j.pilihan, '')) <> ''
          and ne.id is null),
    'per_ujian',
      coalesce((
        select jsonb_agg(jsonb_build_object('ujian_id', x.id, 'judul', x.judul, 'rata', x.rata, 'jumlah', x.jumlah)
                         order by x.judul)
          from (
            select u.id, u.judul, round(avg(p.skor), 1) as rata, count(*) as jumlah
              from public.pemakaian_kode p
              join public.ujian u on u.id = p.ujian_id
             where p.skor is not null
             group by u.id, u.judul
             order by count(*) desc, u.judul
             limit 12
          ) x
      ), '[]'::jsonb),
    'tren',
      (select jsonb_agg(jsonb_build_object('tanggal', to_char(d.hari, 'YYYY-MM-DD'), 'jumlah', coalesce(c.n, 0))
                        order by d.hari)
         from generate_series(v_hari_ini - (v_hari - 1), v_hari_ini, interval '1 day') as g(hari_ts)
         cross join lateral (select g.hari_ts::date as hari) d
         left join (
           select (p.mulai_pada at time zone 'Asia/Jakarta')::date as hari, count(*) as n
             from public.pemakaian_kode p
            where p.mulai_pada is not null
            group by 1
         ) c on c.hari = d.hari)
  );
end;
$$;

revoke all on function public.dashboard_ringkasan(integer) from public, anon;
grant execute on function public.dashboard_ringkasan(integer) to authenticated;
