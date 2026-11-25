# Ruang Prediksi: Panduan Batch 1 (Tahap 1 + 2 + 3)

Isi batch ini:

- **Tahap 1** Setup proyek, login Google, deploy ke Vercel
- **Tahap 2** Skema database + Row Level Security (semua 10 tabel dari cetak biru)
- **Tahap 3** Panel admin: kategori, ujian, soal (3 jenis), tempel banyak soal, duplikat, geser urutan, draf otomatis, pratinjau
- Tampilan responsif (HP, tablet, desktop), tema terang/gelap, halaman peserta (Beranda, Kode saya, Riwayat, Profil)

Belum termasuk (batch berikutnya): pemeriksaan kode ujian (Tahap 4), halaman ujian (Tahap 5), penilaian (6), riwayat detail (7), dashboard (8).

> Pengujian kode dilakukan di akhir batch (bagian 9). Selama pemasangan cukup pastikan `npm run dev` jalan dan tampilan bisa dipantau.

---

## 1. Buat proyek Next.js

Buka PowerShell:

```powershell
cd C:\Projects
npx create-next-app@latest ruang-prediksi
```

Jika ditanya "recommended defaults", pilih **No, customize settings**, lalu jawab:

| Pertanyaan | Jawaban |
|---|---|
| TypeScript | **Yes** |
| ESLint | **Yes** |
| Tailwind CSS | **Yes** |
| `src/` directory | **Yes** |
| App Router | **Yes** |
| React Compiler | No |
| Import alias | tekan Enter (tetap `@/*`) |

Lalu:

```powershell
cd ruang-prediksi
code .
```

Di VS Code buka terminal dengan **Ctrl + `** (tanda petik terbalik).

## 2. Pasang paket tambahan

```powershell
npm install @supabase/supabase-js @supabase/ssr zod clsx tailwind-merge class-variance-authority lucide-react next-themes
```

## 3. Salin file batch ini

Ekstrak zip. Salin **folder `src`** dan **folder `supabase`** ke folder proyek `C:\Projects\ruang-prediksi`. Jika Windows bertanya, pilih **Replace / Timpa** (file bawaan seperti `layout.tsx`, `page.tsx`, `globals.css` memang diganti).

Salin juga `.env.example` ke folder proyek, lalu buat salinannya bernama `.env.local`:

```powershell
copy .env.example .env.local
```

## 4. Buat project Supabase

1. Buka supabase.com/dashboard, **New project**.
2. Nama: `ruang-prediksi`. Region: **Southeast Asia (Singapore)**. Simpan password database.
3. Setelah siap, buka **Project Settings → API** (atau menu **API Keys**). Salin:
   - **Project URL** → isi `NEXT_PUBLIC_SUPABASE_URL` di `.env.local`
   - **anon key** atau **publishable key** → isi `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Jangan isi/bagikan service role key dulu (baru dipakai di Batch 2).

## 5. Jalankan skema database

1. Supabase → **SQL Editor → New query**.
2. Buka file `supabase/migrations/001_skema.sql` di VS Code, salin semua isinya, tempel, klik **Run**.
3. Harus muncul `Success. No rows returned`.
4. Cek di **Table Editor**: ada tabel `profiles`, `kategori`, `ujian`, `soal`, `kode_ujian`, `pemakaian_kode`, `jawaban`, `nilai_esai`, `log_pelanggaran`, `log_admin`.

## 6. Aktifkan login Google

**A. Google Cloud Console** (console.cloud.google.com)

1. Buat project baru (nama bebas, mis. `ruang-prediksi`).
2. **APIs & Services → OAuth consent screen**: pilih **External**, isi nama aplikasi `Ruang Prediksi`, email kamu. Simpan.
3. Di halaman consent screen yang sama, klik **Publish app** (status "In production"). Aplikasi hanya meminta email dan profil dasar, jadi tidak perlu verifikasi Google. Jika dibiarkan "Testing", hanya email yang kamu daftarkan sebagai *Test users* yang bisa login.
4. **Credentials → Create credentials → OAuth client ID**, tipe **Web application**.
5. Bagian **Authorized redirect URIs**: isi alamat callback dari Supabase (langkah B nomor 2), bentuknya `https://XXXX.supabase.co/auth/v1/callback`.
6. Klik Create, lalu salin **Client ID** dan **Client secret**.

**B. Supabase**

1. **Authentication → Sign In / Providers → Google**: aktifkan, tempel Client ID dan Client secret, **Save**.
2. Di halaman Google itu ada **Callback URL (for OAuth)**. Salin ke Google Cloud (langkah A nomor 5) jika belum.
3. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect URLs, tambahkan: `http://localhost:3000/**`

## 7. Jalankan dan pantau tampilan

```powershell
npm run dev
```

Buka http://localhost:3000. Setiap file disimpan, browser langsung ter-update (hot reload), jadi kamu bisa memantau desain sambil mengedit di VS Code.

Cek tampilan di berbagai ukuran layar: tekan **F12**, lalu **Ctrl + Shift + M** (mode perangkat), pilih iPhone/Pixel/iPad. Tampilan HP memakai menu bawah, tablet/desktop memakai sidebar.

Setelah mengubah `.env.local`, hentikan server (Ctrl + C) lalu `npm run dev` lagi.

## 8. Jadikan dirimu admin

1. Di http://localhost:3000 klik **Masuk dengan Google** (login pertama membuat profilmu otomatis).
2. Supabase → SQL Editor, jalankan (ganti emailnya):

```sql
update public.profiles set peran = 'admin' where email = 'emailmu@gmail.com';
```

3. Kembali ke aplikasi, buka **Profil → Buka panel admin** atau langsung http://localhost:3000/admin.

Admin tidak bisa dinaikkan dari dalam aplikasi, sesuai cetak biru.

## 9. Pengujian akhir batch

Centang satu per satu. Tiap fungsi punya minimal satu kasus salah.

**Persiapan**
- [ ] `npx tsc --noEmit` tidak menampilkan galat
- [ ] `npm run build` selesai tanpa galat (ini yang juga dijalankan Vercel)

**Login & akses**
- [ ] Login Google berhasil, masuk ke Beranda, namamu tampil
- [ ] Tabel `profiles` terisi barisanmu
- [ ] *(salah)* Buka `/admin` saat belum login → diarahkan ke halaman masuk
- [ ] *(salah)* Login dengan akun Google lain (bukan admin) lalu buka `/admin` → diarahkan ke Beranda
- [ ] Keluar dari Profil berfungsi

**Kategori**
- [ ] Tambah, ubah, hapus kategori
- [ ] *(salah)* Nama 2 huruf → pesan galat merah
- [ ] *(salah)* Hapus kategori yang masih punya ujian → pesan penolakan

**Ujian**
- [ ] Tambah ujian, ubah lewat "Pengaturan ujian"
- [ ] *(salah)* Durasi `abc` atau `0` → pesan galat
- [ ] *(salah)* Judul 2 huruf → pesan galat

**Soal**
- [ ] Buat satu soal tiap jenis: pilihan ganda (tandai kunci), isian (beberapa chip), esai
- [ ] *(salah)* Pilihan ganda tanpa kunci → pesan galat
- [ ] *(salah)* Isian tanpa jawaban → pesan galat
- [ ] Pratinjau di sisi kanan ikut berubah saat mengetik
- [ ] Draf otomatis: ketik sebagian soal baru, refresh halaman → muncul "Draf dipulihkan"
- [ ] Duplikat soal → salinan muncul tepat di bawah aslinya
- [ ] Geser urutan (seret di desktop, tombol panah di HP), refresh, urutan tetap
- [ ] Hapus soal → nomor sesudahnya rapi lagi

**Tempel banyak soal**
- [ ] Klik "Isi dengan contoh" → 3 soal terbaca, simpan berhasil
- [ ] *(salah)* Ubah `KUNCI: B` jadi `KUNCI: Z` → blok bermasalah tampil merah, tombol Simpan mati

**Tampilan**
- [ ] Lebar 375 px (HP): menu bawah di peserta, menu geser di admin, tidak ada scroll ke samping
- [ ] Lebar 768 px dan 1280 px: sidebar muncul
- [ ] Tema gelap/terang berfungsi di semua halaman

**Keamanan dasar**
- [ ] Supabase → Table Editor: tidak ada tabel berlabel "RLS disabled"

## 10. Kirim ke GitHub dan Vercel (deploy kosong)

```powershell
git init
git add .
git commit -m "Batch 1: setup, skema, panel admin"
git branch -M main
```

Buat repo **private** bernama `ruang-prediksi` di GitHub, lalu:

```powershell
git remote add origin https://github.com/USERNAME/ruang-prediksi.git
git push -u origin main
```

Pastikan `.env.local` **tidak** ikut ter-commit (bawaan Next sudah mengabaikannya lewat `.gitignore`).

Vercel: **Add New → Project**, impor repo, buka **Environment Variables**, isi dua variabel (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`), lalu **Deploy**.

Setelah dapat alamat Vercel (mis. `ruang-prediksi.vercel.app`), kembali ke Supabase → **Authentication → URL Configuration**:
- Site URL: alamat Vercel kamu
- Redirect URLs: tambahkan `https://ruang-prediksi.vercel.app/**` (biarkan yang localhost tetap ada)

## Jika ada masalah

| Gejala | Penyebab / solusi |
|---|---|
| `Invalid API key` / halaman error Supabase | `.env.local` belum diisi, atau server belum dimulai ulang |
| `redirect_uri_mismatch` dari Google | Redirect URI di Google Cloud harus persis sama dengan Callback URL dari Supabase |
| Setelah login kembali ke `/?galat=masuk` | Redirect URLs di Supabase belum memuat `http://localhost:3000/**` |
| `relation "public.kategori" does not exist` | SQL langkah 5 belum dijalankan |
| Sudah di-`update` jadi admin tapi tetap ditolak | Email pada `update` harus persis sama dengan email Google; keluar lalu masuk lagi |
| Next menampilkan peringatan soal `proxy.ts` / `middleware` | Jika versi Next kamu 15 (bukan 16), ubah nama `src/proxy.ts` menjadi `src/middleware.ts` dan nama fungsi `proxy` menjadi `middleware` |

## Catatan rancangan

- **Aturan "satu kode per ujian"** dijaga trigger database (bukan unique index) supaya admin bisa mematikannya per ujian. Aturan "kode yang sama tidak boleh dipakai dua kali" dan "satu sesi berjalan per akun" dijaga constraint.
- **Jawaban peserta** baru bisa dibaca peserta setelah sesinya selesai, supaya benar/salah tidak bocor saat ujian.
- **Soal, kunci, dan kode** hanya bisa dibaca admin lewat database. Peserta nanti mengambil soal lewat fungsi server (Tahap 5).
- Soal ujian yang sudah pernah dijawab peserta tidak bisa dihapus, dan ujian yang sudah punya riwayat tidak bisa dihapus (arsipkan saja).
- **Draf otomatis** tersimpan di browser (localStorage) per soal, bukan di database.
- Teks soal saat ini teks biasa. Rumus matematika dan gambar belum didukung; ini perlu diputuskan sebelum mengisi soal Matematika dalam jumlah besar.
- **iPhone (Safari)** tidak mendukung fullscreen untuk halaman web. Keputusan perlakuannya (nonaktifkan pelanggaran fullscreen di iPhone, atau minta pasang ke layar utama) dibutuhkan sebelum Tahap 5.
