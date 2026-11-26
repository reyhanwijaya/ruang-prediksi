# Panduan Batch 3: Tahap 6 (nilai esai) + Tahap 7 (riwayat detail & pembahasan)

## 1. Pasang
1. Salin folder `src` dan `supabase` dari zip ke proyek (**Replace/Timpa**). Tidak ada paket baru yang perlu dipasang.
2. Supabase → **SQL Editor → New query** → tempel seluruh isi `supabase/migrations/003_esai_dan_riwayat.sql` → **Run**. Harus `Success`. Aman dijalankan ulang.
3. Kalau `npm run dev` sedang jalan, biarkan saja (hot reload). Kalau halaman baru tidak muncul, hentikan (Ctrl+C) lalu jalankan lagi.

## 2. Yang baru
- **Admin → Nilai esai**: antrean jawaban esai dari sesi yang sudah selesai. Filter Menunggu / Sudah dinilai / Semua, dan filter per ujian. Admin memberi nilai 0 sampai bobot soal plus komentar. Setelah disimpan, skor peserta dihitung ulang otomatis. Nilai bisa diubah lagi kapan saja.
- **Peserta → Riwayat → ketuk satu ujian**: detail tiap soal (jawabanmu, kunci, benar/salah, nilai dan komentar esai, pembahasan), rangkuman skor, dan catatan pelanggaran. Pembahasan langsung terlihat setelah ujian selesai.
- **Admin → Kode ujian**: tiap pemakai yang sudah selesai punya tautan **Detail** untuk melihat jawabannya.

## 3. Daftar uji
Siapkan satu ujian yang berisi soal **pilihan ganda, isian, dan esai** (bobot esai misalnya 2), dengan pembahasan terisi di beberapa soal.

**Peserta mengerjakan**
1. Login sebagai peserta, kerjakan ujian itu: jawab semua soal (esai ditulis beberapa kalimat), lalu Kumpulkan.
2. Layar hasil: skor tampil "–" dan muncul pesan "Menunggu nilai esai".
3. Riwayat: statusnya "Menunggu nilai esai". Ketuk entrinya → detail terbuka; soal esai berstatus "Menunggu nilai", pilihan ganda/isian sudah benar/salah, kunci dan pembahasan tampil.

**Admin menilai**
4. Login sebagai admin → **Nilai esai**. Jawaban tadi ada di tab Menunggu, lengkap dengan soal dan rubrik.
5. *(salah)* Nilai lebih besar dari bobot (mis. 5 untuk bobot 2) → pesan galat merah.
6. *(salah)* Nilai kosong atau `abc` → pesan galat. Nilai `-1` → pesan galat.
7. Nilai `1,5` (koma boleh) + komentar → "Tersimpan. Skor sesi: …". Contoh: PG 1 + isian 1 + esai 1,5 dari total bobot 4 = skor 88.
8. Pindah ke tab **Sudah dinilai**: entri itu ada di sana. Ubah nilai jadi 2 → skor 100. Ubah jadi 0 → skor 50.
9. Tab Menunggu kosong dan menampilkan "Tidak ada esai yang menunggu nilai."

**Peserta melihat hasil**
10. Peserta muat ulang Riwayat: status "Selesai", skor muncul. Di detail, esai menampilkan nilai dan komentar penilai.
11. *(salah)* Peserta mengetik langsung `/admin/esai` → dikembalikan ke Beranda.
12. *(salah)* Login dengan akun peserta lain, buka alamat detail riwayat milik orang pertama (salin URL-nya) → halaman "tidak ditemukan".
13. *(salah)* Buka detail riwayat saat ujiannya masih berjalan → diarahkan kembali ke halaman ujian.
14. Ujian yang dikunci/waktu habis: detail menampilkan catatan pelanggaran dan jawaban yang sempat tersimpan.

**Tampilan**
15. Lebar 375 px: detail riwayat dan kartu esai tidak ada scroll ke samping; rumus `$...$` tampil benar di detail.

## 4. Catatan keputusan
- Esai kosong tidak masuk antrean dan tidak menahan skor.
- Nilai esai boleh desimal; batasnya 0 sampai bobot soal, dijaga di database (bukan hanya di layar).
- Kalau admin mengubah kunci/jawaban soal setelah ada peserta mengerjakan, skor lama tidak otomatis berubah. Skor baru dihitung ulang saat admin menyimpan nilai esai pada sesi itu.
- Tindakan menilai esai tercatat di log admin (tampilan log ada di Tahap 8).
- Tahap 8 berikutnya: dashboard (kartu ringkasan, grafik, antrean esai, tabel pemakaian + ekspor CSV, log admin dan pelanggaran).
