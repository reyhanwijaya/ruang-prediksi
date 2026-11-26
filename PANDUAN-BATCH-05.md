# Panduan Batch 5: Tahap 9 (uji menyeluruh, perapian, deploy, uji dengan teman)

## 1. Pasang pembaruan
1. Salin folder `src`, `supabase`, dan file `next.config.ts`, `.env.example` dari zip ke proyek (**Replace/Timpa**). Tidak ada paket baru dan **tidak ada SQL baru** di batch ini.
2. `next.config.ts` yang baru hanya menambah header keamanan. Kalau Anda pernah mengubah file itu sendiri, jangan ditimpa; cukup tambahkan blok `headers()` dari zip.
3. Restart `npm run dev` (Ctrl+C lalu jalankan lagi).

Yang berubah: halaman "Terjadi gangguan" (error) dan kerangka pemuatan di tiap area, header keamanan, pesan galat di terminal bila profil gagal dibaca (jadi masalah izin seperti kemarin langsung terlihat), `.env.example` dirapikan, dan skrip opsional untuk membersihkan data uji.

## 2. Deploy ke Vercel
1. Pastikan kode terbaru sudah di GitHub:
   ```powershell
   git add .
   git commit -m "Batch 5"
   git push
   ```
2. Buka vercel.com → login dengan GitHub (akun **reyhanwijaya**) → **Add New… → Project** → pilih repo `ruang-prediksi` → **Import**.
3. Framework otomatis **Next.js**. Buka bagian **Environment Variables** dan isi dua nilai yang sama seperti di `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Klik **Deploy**, tunggu 1–3 menit. Catat alamatnya, misalnya `https://ruang-prediksi.vercel.app`.
5. **Supabase → Authentication → URL Configuration:**
   - Site URL: ganti ke alamat Vercel tadi.
   - Redirect URLs: **tambahkan** `https://ruang-prediksi.vercel.app/**` (biarkan `http://localhost:3000/**` tetap ada).
6. Google Cloud tidak perlu diubah (redirect-nya tetap alamat callback Supabase). Pastikan OAuth consent screen berstatus **In production / Published**, kalau tidak, hanya akun yang terdaftar sebagai test user yang bisa login.
7. Buka alamat Vercel di browser, login Google, lalu cek: Beranda, `/admin` (akun admin), buat kode, kerjakan satu ujian sampai hasil.

Setiap `git push` ke cabang `main` otomatis men-deploy ulang.

## 3. Uji menyeluruh sebelum mengundang teman
Lakukan di alamat Vercel (bukan localhost), dengan akun admin dan satu akun peserta.
1. Seluruh daftar uji `PANDUAN-BATCH-02/03/04` dijalankan ulang sekali, terutama: kode salah, kuota, kode dicabut, tab pindah, keluar layar penuh, waktu habis, nilai esai, reset, ekspor CSV.
2. **Refresh di tengah ujian** → lanjut dengan sisa waktu yang benar.
3. **Internet mati sebentar** saat ujian (matikan Wi-Fi 10 detik, nyalakan lagi) → tulisan "Gagal menyimpan. Coba lagi" muncul, lalu jawaban tersimpan setelah koneksi kembali dan tombol dicoba.
4. **Dua perangkat sekaligus** dengan akun peserta yang sama: ujian yang berjalan di perangkat pertama tidak boleh punya "kembaran" lain; kode lain tidak bisa dimulai selama satu sesi berjalan.

## 4. Uji di HP nyata (wajib, sesuai cetak biru)
| Perangkat | Yang dicek |
|---|---|
| Android + Chrome | Layar penuh aktif saat Mulai; Esc/tombol Back memicu peringatan; pindah aplikasi dicatat; timer tetap benar setelah layar terkunci lalu dibuka |
| iPhone + Safari | Pesan "perangkat tidak mendukung layar penuh" muncul; ujian tetap jalan; pindah tab/aplikasi tetap dicatat; **tidak** ada peringatan layar penuh |
| Keduanya | Panel nomor soal (tombol "Daftar soal"), mengetik jawaban isian/esai (keyboard tidak menutupi tombol), rumus terbaca, tampilan terang dan gelap |

## 5. Uji coba dengan teman
1. Minta 3–5 teman memakai akun Google masing-masing (campur Android dan iPhone).
2. Siapkan satu ujian pendek (5–10 soal, ketiga jenis soal, ada pembahasan) dan buat kode di **Kode ujian** dengan kuota sesuai jumlah teman.
3. Kirim ke teman: alamat Vercel, kode, dan kalimat: "Mohon catat kalau ada yang membingungkan, error, atau tidak bisa dipakai."
4. Pantau lewat **Dashboard**, **Pemakaian**, dan **Log** → Pelanggaran. Nilai esai mereka di **Nilai esai**.
5. Tanyakan ke teman: (a) apakah alur login dan memasukkan kode jelas, (b) apakah peringatan layar penuh terasa wajar, (c) apakah timer dan tombol Kumpulkan jelas, (d) halaman riwayat/pembahasan mudah dibaca, (e) perangkat apa yang dipakai dan apa yang rusak.
6. Kumpulkan temuan, kirim ke saya, dan kita perbaiki di batch berikutnya.

## 6. Setelah uji coba selesai
Opsional: jalankan `supabase/utils/bersihkan-data-uji.sql` di SQL Editor untuk menghapus semua sesi, jawaban, kode, dan log hasil uji coba. Kategori, ujian, soal, dan akun **tidak** dihapus. Tindakan ini tidak bisa dibatalkan.

## 7. Hal yang perlu diketahui (paket gratis)
- **Supabase gratis menjeda project** yang tidak dipakai sekitar 7 hari. Kalau terjeda, buka dashboard Supabase lalu tekan **Restore**. Buka aplikasi minimal seminggu sekali selama masa uji.
- Supabase gratis tidak menyediakan cadangan otomatis. Simpan soal penting juga di berkas milik Anda sendiri (fitur impor soal memudahkan memasukkan ulang).
- Vercel gratis (Hobby) ditujukan untuk penggunaan pribadi non-komersial, sesuai rencana proyek ini.
- Nama domain masih memakai alamat Vercel; domain sendiri bisa ditambahkan nanti di Vercel → Settings → Domains.
- Pengamanan ujian adalah pencegah dasar, bukan jaminan: kamera HP kedua, screenshot dari perangkat lain, atau bantuan orang lain tidak bisa dicegah browser.

## 8. Hasil uji otomatis di sisi database
Skema SQL 001–004 diuji di Postgres 16 dengan skenario "penyerangan": akun peserta mencoba membaca soal/kode/log, menaikkan diri jadi admin, menulis langsung ke tabel jawaban/pemakaian/nilai, memanggil fungsi internal dan fungsi admin, memakai sesi milik peserta lain, mengirim opsi/nomor/pelanggaran tidak valid, memakai kode berisi perintah SQL, melewati batas waktu, serta akses tanpa login. Seluruh ~70 pengecekan menghasilkan penolakan atau hasil kosong sebagaimana mestinya.
