-- =====================================================================
-- Ruang Prediksi - Migrasi 003: antrean esai, nilai esai, detail riwayat
-- Jalankan SETELAH 001 dan 002. Aman dijalankan ulang.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Antrean esai (admin). p_status: 'menunggu' | 'dinilai' | 'semua'
-- Hanya jawaban esai tidak kosong dari sesi yang sudah berakhir.
-- ---------------------------------------------------------------------
create or replace function public.antrean_esai(p_ujian uuid default null, p_status text default 'menunggu')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh melihat antrean esai.' using errcode = '42501';
  end if;
  if p_status not in ('menunggu', 'dinilai', 'semua') then
    raise exception 'Status antrean tidak valid.';
  end if;

  -- sesi yang waktunya habis ikut ditutup agar jawabannya masuk antrean
  perform public._tutup_kadaluarsa(null);

  return coalesce((
    select jsonb_agg(x.baris order by x.selesai, x.nomor)
      from (
        select p.selesai_pada as selesai,
               s.nomor as nomor,
               jsonb_build_object(
                 'jawaban_id', j.id,
                 'pemakaian_id', p.id,
                 'peserta_nama', pr.nama,
                 'peserta_email', pr.email,
                 'ujian_id', u.id,
                 'ujian_judul', u.judul,
                 'nomor', s.nomor,
                 'teks', s.teks,
                 'gambar_url', s.gambar_url,
                 'rubrik', s.rubrik,
                 'bobot', s.bobot,
                 'jawaban', j.pilihan,
                 'nilai', ne.nilai,
                 'komentar', ne.komentar,
                 'dinilai_pada', ne.dinilai_pada,
                 'selesai_pada', p.selesai_pada
               ) as baris
          from public.jawaban j
          join public.pemakaian_kode p on p.id = j.pemakaian_id
          join public.soal s on s.id = j.soal_id and s.jenis = 'esai'
          join public.ujian u on u.id = p.ujian_id
          join public.profiles pr on pr.id = p.user_id
          left join public.nilai_esai ne on ne.jawaban_id = j.id
         where p.status <> 'berjalan'
           and btrim(coalesce(j.pilihan, '')) <> ''
           and (p_ujian is null or p.ujian_id = p_ujian)
           and (
                p_status = 'semua'
                or (p_status = 'menunggu' and ne.id is null)
                or (p_status = 'dinilai' and ne.id is not null)
           )
         order by p.selesai_pada nulls last, s.nomor
         limit 500
      ) x
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------
-- Simpan nilai esai (admin): 0 sampai bobot soal. Skor sesi dihitung ulang.
-- ---------------------------------------------------------------------
create or replace function public.nilai_esai_simpan(p_jawaban uuid, p_nilai numeric, p_komentar text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  j       public.jawaban%rowtype;
  s       public.soal%rowtype;
  p       public.pemakaian_kode%rowtype;
  v_kom   text := nullif(btrim(coalesce(p_komentar, '')), '');
  v_skor  numeric;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh menilai esai.' using errcode = '42501';
  end if;

  select * into j from public.jawaban where id = p_jawaban;
  if not found then
    return jsonb_build_object('ok', false, 'pesan', 'Jawaban tidak ditemukan.');
  end if;
  select * into s from public.soal where id = j.soal_id;
  select * into p from public.pemakaian_kode where id = j.pemakaian_id;

  if s.jenis <> 'esai' then
    return jsonb_build_object('ok', false, 'pesan', 'Hanya soal esai yang dinilai manual.');
  end if;
  if p.status = 'berjalan' then
    return jsonb_build_object('ok', false, 'pesan', 'Sesi peserta masih berjalan.');
  end if;
  if p_nilai is null or p_nilai < 0 or p_nilai > s.bobot then
    return jsonb_build_object('ok', false, 'pesan', format('Nilai harus antara 0 dan %s.', trim_scale(s.bobot)));
  end if;
  if v_kom is not null and length(v_kom) > 1000 then
    return jsonb_build_object('ok', false, 'pesan', 'Komentar maksimal 1000 karakter.');
  end if;

  insert into public.nilai_esai (jawaban_id, nilai, komentar, dinilai_oleh, dinilai_pada)
  values (j.id, p_nilai, v_kom, auth.uid(), now())
  on conflict (jawaban_id) do update
    set nilai = excluded.nilai,
        komentar = excluded.komentar,
        dinilai_oleh = excluded.dinilai_oleh,
        dinilai_pada = excluded.dinilai_pada;

  update public.jawaban set nilai = p_nilai where id = j.id;
  perform public._hitung_skor(p.id);

  insert into public.log_admin (admin_id, aksi, sasaran_id, nilai)
  values (auth.uid(), 'nilai_esai', j.id,
          jsonb_build_object('nilai', p_nilai, 'bobot', s.bobot, 'pemakaian_id', p.id));

  select skor into v_skor from public.pemakaian_kode where id = p.id;
  return jsonb_build_object('ok', true, 'skor', v_skor, 'menunggu_esai', v_skor is null);
end;
$$;

-- ---------------------------------------------------------------------
-- Detail riwayat satu sesi: jawaban, kunci, nilai, pembahasan.
-- Hanya untuk pemilik sesi (atau admin) dan hanya setelah sesi berakhir.
-- ---------------------------------------------------------------------
create or replace function public.riwayat_detail(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.pemakaian_kode%rowtype;
  u public.ujian%rowtype;
begin
  select * into p from public.pemakaian_kode where id = p_id;
  if not found or not (p.user_id = auth.uid() or public.is_admin()) then
    return jsonb_build_object('ok', false, 'kode', 'tidak_ada', 'pesan', 'Riwayat tidak ditemukan.');
  end if;

  perform public._tutup_kadaluarsa(p.user_id);
  select * into p from public.pemakaian_kode where id = p_id;

  if p.status = 'berjalan' then
    return jsonb_build_object('ok', false, 'kode', 'berjalan', 'pesan', 'Ujian ini masih berjalan.');
  end if;

  select * into u from public.ujian where id = p.ujian_id;

  return jsonb_build_object(
    'ok', true,
    'ujian', jsonb_build_object('id', u.id, 'judul', u.judul),
    'mulai_pada', p.mulai_pada,
    'selesai_pada', p.selesai_pada,
    'hasil', public._hasil(p.id),
    'soal', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'nomor', s.nomor,
                 'jenis', s.jenis,
                 'teks', s.teks,
                 'gambar_url', s.gambar_url,
                 'bobot', s.bobot,
                 'opsi', s.opsi,
                 'kunci', s.kunci,
                 'jawaban_benar', case when s.jenis = 'isian' then s.jawaban_isian else null end,
                 'pembahasan', s.pembahasan,
                 'jawaban', j.pilihan,
                 'nilai', case when s.jenis = 'esai' then ne.nilai else j.nilai end,
                 'komentar', ne.komentar,
                 'status', case
                   when j.id is null or btrim(coalesce(j.pilihan, '')) = '' then 'kosong'
                   when s.jenis = 'esai' then
                     case
                       when ne.id is null then 'menunggu'
                       when ne.nilai >= s.bobot then 'benar'
                       when ne.nilai > 0 then 'sebagian'
                       else 'salah'
                     end
                   when coalesce(j.nilai, 0) >= s.bobot then 'benar'
                   else 'salah'
                 end
               )
               order by s.nomor
             )
        from public.soal s
        left join public.jawaban j on j.soal_id = s.id and j.pemakaian_id = p.id
        left join public.nilai_esai ne on ne.jawaban_id = j.id
       where s.ujian_id = p.ujian_id
    ), '[]'::jsonb),
    'pelanggaran', coalesce((
      select jsonb_agg(jsonb_build_object('jenis', l.jenis, 'waktu', l.dicatat_pada) order by l.dicatat_pada)
        from public.log_pelanggaran l
       where l.pemakaian_id = p.id
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Izin fungsi
-- ---------------------------------------------------------------------
revoke all on function public.antrean_esai(uuid, text)                    from public, anon;
revoke all on function public.nilai_esai_simpan(uuid, numeric, text)      from public, anon;
revoke all on function public.riwayat_detail(uuid)                        from public, anon;

grant execute on function public.antrean_esai(uuid, text)                 to authenticated;
grant execute on function public.nilai_esai_simpan(uuid, numeric, text)   to authenticated;
grant execute on function public.riwayat_detail(uuid)                     to authenticated;
