# Panduan Batch 4: Tahap 8 (dashboard, pemakaian, log)

## 1. Pasang
1. Salin folder `src` dan `supabase` dari zip ke proyek (**Replace/Timpa**). Tidak ada paket baru.
2. Supabase → **SQL Editor → New query** → tempel isi `supabase/migrations/004_dashboard.sql` → **Run** (`Success`). Aman diulang.
3. Buka http://localhost:3000/admin. Kalau tampilan lama masih muncul, hentikan `npm run dev` (Ctrl+C) lalu jalankan lagi.

## 2. Yang baru (login sebagai admin)
- **Dashboard** (`/admin`): 4 kartu (Ujian aktif, Kode aktif, Pemakaian hari ini, Rata-rata skor), grafik rata-rata skor per ujian, grafik pemakaian 14 hari terakhir (arahkan kursor/jari ke garis untuk melihat angka; ada juga "Lihat sebagai tabel"), dan daftar esai yang menunggu nilai.
- **Pemakaian** (menu baru): tabel siapa memakai kode apa. Filter ujian, status, kode, nama/email. Per baris: Detail jawaban, Reset (alasan wajib), dan angka pelanggaran yang bisa diklik. Tombol **Ekspor CSV** mengunduh hasil sesuai filter (maks. 5.000 baris).
- **Log** (menu baru): tab **Log admin** (ubah kuota, cabut/aktifkan kode, reset, nilai esai, lengkap dengan pelaku, waktu, alasan) dan tab **Pelanggaran** (per kejadian, bisa difilter per sesi).

## 3. Daftar uji
Siapkan beberapa data: minimal 2 ujian, 2–3 sesi yang selesai (satu dengan pelanggaran), satu esai yang sudah dan satu yang belum dinilai.

**Dashboard**
1. Kartu terisi benar: Ujian aktif = jumlah ujian berstatus terbit; Kode aktif = kode yang belum dicabut dan kuotanya belum penuh; Pemakaian hari ini = sesi yang dimulai hari ini (WIB); Rata-rata skor sesuai rata-rata skor yang ada.
2. Grafik batang: tiap ujian satu baris dengan angka rata-rata dan jumlah sesi.
3. Grafik 14 hari: titik hari ini sesuai jumlah sesi hari ini; sentuh/arahkan ke garis → tooltip tanggal + jumlah; tombol panah kiri/kanan juga berfungsi saat grafik terfokus (Tab).
4. Daftar esai menunggu: jumlahnya sama dengan di halaman Nilai esai. Nilai satu esai lalu muat ulang dashboard → jumlahnya turun.
5. Database kosong (project baru): dashboard tetap tampil tanpa error, dengan pesan "Belum ada…".
6. Mode gelap dan lebar 375 px: grafik terbaca, tidak ada scroll ke samping (tabel Pemakaian boleh digeser ke samping).

**Pemakaian**
7. Pilih satu ujian → hanya sesi ujian itu. Pilih status "Dikunci" → hanya yang dikunci.
8. Ketik sebagian kode (huruf kecil juga boleh) dan sebagian nama/email → tabel menyempit.
9. *(salah)* Kode yang tidak ada → "Tidak ada pemakaian yang cocok." dan tautan Hapus filter bekerja.
10. *(salah)* Ketik karakter aneh seperti `,)(%*` di kolom nama → tidak error, tetap menampilkan hasil/kosong.
11. Reset: alasan kosong ditolak; isi alasan → baris hilang, dan muncul di Log admin dengan alasannya.
12. Klik angka pelanggaran → membuka Log tab Pelanggaran khusus sesi itu.
13. **Ekspor CSV**: file `pemakaian-<tanggal>.csv` terunduh dan terbuka rapi di Excel (kolom terpisah, huruf Indonesia benar). Isi sesuai filter yang aktif.
14. Lebih dari 25 data → tombol Sebelumnya/Berikutnya muncul dan filter tidak hilang saat pindah halaman.

**Log**
15. Log admin menampilkan tindakan terbaru di atas: ubah kuota, cabut kode, nilai esai (ada tautan "Lihat"), reset.
16. Tab Pelanggaran: jenis pelanggaran + waktu + peserta; "Per sesi" menyaring satu sesi; "Tampilkan semua" mengembalikan.

**Keamanan**
17. *(salah)* Akun peserta membuka `/admin/pemakaian`, `/admin/log`, dan `/admin/pemakaian/csv` → tidak bisa (dialihkan atau ditolak).

## 4. Catatan
- Pemisah CSV memakai **titik koma (;)** supaya langsung rapi di Excel berbahasa Indonesia. Di Google Sheets: File → Import → pilih file, pemisah terdeteksi otomatis. Skor di CSV dibulatkan.
- Sel CSV yang diawali `=`, `+`, `-`, `@` diberi tanda `'` di depannya agar tidak dijalankan sebagai rumus oleh Excel.
- Grafik dibuat sendiri tanpa pustaka, jadi tidak ada paket baru yang perlu dipasang.
- Sebelum menampilkan angka, dashboard dan halaman Pemakaian menutup otomatis sesi yang waktunya sudah habis.
- Tahap 9 berikutnya: uji menyeluruh, perapian, dan persiapan deploy ke Vercel.
