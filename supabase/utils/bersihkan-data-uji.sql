-- =====================================================================
-- OPSIONAL: bersihkan data uji coba sebelum dipakai sungguhan.
-- MENGHAPUS: semua sesi ujian, jawaban, nilai esai, log pelanggaran, log admin,
--            catatan percobaan kode, dan semua kode ujian.
-- TIDAK MENGHAPUS: kategori, ujian, soal, akun/profil, gambar.
-- Tidak bisa dibatalkan. Jalankan hanya kalau kamu yakin.
-- =====================================================================
begin;
  delete from public.nilai_esai;
  delete from public.jawaban;
  delete from public.log_pelanggaran;
  delete from public.pemakaian_kode;
  delete from public.kode_ujian;
  delete from public.percobaan_kode;
  delete from public.log_admin;
commit;
