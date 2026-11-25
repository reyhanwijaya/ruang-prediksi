# Panduan Batch 2 — Tahap 4 (kode ujian) + Tahap 5 (halaman ujian) + rumus & gambar

## 1. Pasang
1. Buka terminal di folder proyek, jalankan:
   ```
   npm install katex
   npm install -D @types/katex
   ```
2. Salin isi zip ini ke proyek dan **timpa** file yang sama (`src/` dan `supabase/`).
3. Supabase → **SQL Editor** → tempel seluruh isi `supabase/migrations/002_kode_dan_ujian.sql` → **Run**. (Aman dijalankan ulang.)
4. Hentikan `npm run dev` (Ctrl+C), jalankan lagi.

## 2. Yang baru
- **Admin → Kode ujian**: buat kode (1–100 sekaligus, kuota bebas), salin semua, ubah kuota, cabut/aktifkan, lihat pemakai, reset pemakaian (alasan wajib, tercatat).
- **Peserta**: Beranda memeriksa kode lalu membuka ujian; banner "ujian sedang berjalan"; halaman Kode saya; Riwayat otomatis menutup sesi yang waktunya habis.
- **Halaman ujian**: layar penuh, timer server, simpan otomatis, panel nomor, kumpulkan, pelanggaran, kunci otomatis 3x (jika diaktifkan di ujian), hasil.
- **Editor soal**: rumus `$...$` / `$$...$$` dan unggah gambar pada soal dan tiap opsi.

## 3. Daftar uji (butuh 2 akun Google: admin dan peserta)
**Kode**
1. Admin buat 1 kode kuota 3 untuk ujian berstatus *terbit* berisi beberapa soal.
2. Peserta masukkan kode salah → "Kode tidak ditemukan…".
3. Kode benar → halaman pembuka muncul. Tekan Batal → kembali ke Beranda, kuota tidak berkurang.
4. Kode sama dua kali oleh peserta yang sama setelah selesai → "Anda sudah memakai kode lain/ kode ini…" (ditolak).
5. Buat kode kedua untuk ujian yang sama → peserta yang sudah memakai kode pertama ditolak.
6. Cabut kode → peserta lain gagal memakainya. Aktifkan lagi → bisa.
7. Kuota 1 dipakai 1 orang → orang kedua ditolak. Ubah kuota di bawah pemakaian → ditolak.
8. Masukkan kode salah 8x berturut-turut → "Terlalu banyak percobaan…".
9. Ujian berstatus draf → kodenya tidak bisa dipakai.
10. Admin reset pemakaian (kosongkan alasan → ditolak; isi → berhasil, peserta bisa mengulang).

**Ujian**
11. Mulai ujian → layar penuh aktif, timer jalan. Muat ulang halaman → lanjut dengan sisa waktu yang benar.
12. Tutup tab, buka lagi dari Beranda (banner) → sisa waktu tetap berkurang.
13. Pindah tab/aplikasi → pelanggaran +1. Tekan Esc (keluar layar penuh) → muncul layar peringatan + pelanggaran +1.
14. Ujian dengan "kunci pelanggaran" aktif: pelanggaran ke-3 → sesi dikunci dan jawaban dinilai.
15. Salin/tempel/klik kanan/F12/Ctrl+C dst. tidak berfungsi (kolom jawaban tetap bisa diketik).
16. Biarkan waktu habis → otomatis terkumpul, muncul "Waktu habis".
17. Nilai: pilihan ganda benar/salah; isian "Jakarta" vs " jakarta " (dianggap benar); esai → skor "menunggu nilai esai".
18. Setelah kumpulkan, buka lagi `/ujian/<id>` → langsung tampil hasil.

**Rumus & gambar**
19. Soal berisi `$x^2$` dan `$$\frac{a}{b}$$` tampil sebagai rumus di pratinjau dan di ujian; `\$` tampil sebagai tanda dolar.
20. Unggah gambar PNG/JPG pada soal dan pada opsi; coba berkas PDF/teks → ditolak dengan pesan.
21. iPhone: ujian tetap bisa dikerjakan; layar penuh tidak dipaksakan, pindah tab tetap dicatat.

## 4. Catatan keputusan
- Jawaban masih bisa diubah sampai Kumpulkan atau waktu habis.
- Penilaian otomatis sudah termasuk; tampilan **menilai esai** oleh admin ada di Batch 3 (Tahap 6).
- Tombol **Batal** di halaman pembuka menghapus sesi yang belum dimulai (kuota kembali).
- Setiap opsi pilihan ganda wajib punya teks (gambar saja belum cukup).
- Gambar yang diganti/dihapus di editor tetap ada di Storage (tidak dibersihkan otomatis).
