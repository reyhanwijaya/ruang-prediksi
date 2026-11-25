import type { JenisSoal } from "./types";

/**
 * Pengurai format "tempel banyak soal".
 *
 * Satu soal = satu blok. Antar blok dipisah baris berisi ---
 *
 *   JENIS: pg            (pg / isian / esai; boleh dihilangkan, ditebak otomatis)
 *   SOAL: Berapa hasil 2 + 3?
 *   A. 4
 *   B. 5
 *   C. 6
 *   KUNCI: B
 *   BOBOT: 1             (opsional, bawaan 1)
 *   PEMBAHASAN: 2 + 3 = 5
 *
 * Isian: baris  JAWABAN: Jakarta | DKI Jakarta
 * Esai : baris  RUBRIK: ...  (opsional)
 */

export interface SoalImpor {
  jenis: JenisSoal;
  teks: string;
  opsi: string[];
  kunci_index: number;
  jawaban_isian: string[];
  bobot: number;
  rubrik: string;
  pembahasan: string;
}

export interface GalatImpor {
  blok: number;
  pesan: string;
}

export interface HasilImpor {
  soal: SoalImpor[];
  galat: GalatImpor[];
}

export const CONTOH_IMPOR = `JENIS: pg
SOAL: Berapa hasil dari 2 + 3?
A. 4
B. 5
C. 6
D. 7
KUNCI: B
BOBOT: 1
PEMBAHASAN: Dua ditambah tiga sama dengan lima.
---
JENIS: isian
SOAL: Sebutkan ibu kota Indonesia.
JAWABAN: Jakarta | DKI Jakarta
PEMBAHASAN: Ibu kota negara Indonesia adalah Jakarta.
---
JENIS: esai
SOAL: Jelaskan dua penyebab terjadinya hujan.
BOBOT: 5
RUBRIK: Skor penuh jika menyebut penguapan dan kondensasi.
`;

const REGEX_KUNCI = /^(JENIS|SOAL|KUNCI|BOBOT|PEMBAHASAN|JAWABAN|RUBRIK)\s*:\s*(.*)$/i;
const REGEX_OPSI = /^([A-Ja-j])\s*[.)]\s+(.*)$/;

function bacaJenis(nilai: string): JenisSoal | null {
  const s = nilai.trim().toLowerCase().replace(/[_\s-]+/g, " ");
  if (s === "pg" || s === "pilihan ganda") return "pilihan_ganda";
  if (s === "isian") return "isian";
  if (s === "esai" || s === "essay") return "esai";
  return null;
}

export function parseImpor(mentah: string): HasilImpor {
  const blokBlok = mentah
    .replace(/\r\n?/g, "\n")
    .split(/^[ \t]*-{3,}[ \t]*$/m)
    .map((b) => b.trim())
    .filter(Boolean);

  const soal: SoalImpor[] = [];
  const galat: GalatImpor[] = [];

  blokBlok.forEach((isi, i) => {
    const blok = i + 1;
    const gagal = (pesan: string) => galat.push({ blok, pesan });

    const f: Record<string, string> = {};
    const opsi: { huruf: string; teks: string }[] = [];
    let kini: string | null = null;

    for (const baris of isi.split("\n")) {
      const rapi = baris.trim();

      const k = REGEX_KUNCI.exec(rapi);
      if (k) {
        kini = k[1].toUpperCase();
        f[kini] = k[2].trim();
        continue;
      }

      const o = REGEX_OPSI.exec(rapi);
      if (o && (kini === null || kini === "SOAL" || kini === "OPSI")) {
        opsi.push({ huruf: o[1].toUpperCase(), teks: o[2].trim() });
        kini = "OPSI";
        continue;
      }

      if (!rapi) {
        if (kini && kini !== "OPSI") f[kini] += "\n";
        continue;
      }
      if (kini === "OPSI") {
        opsi[opsi.length - 1].teks += " " + rapi;
        continue;
      }
      if (kini === null) {
        kini = "SOAL";
        f.SOAL = rapi;
        continue;
      }
      f[kini] += "\n" + rapi;
    }

    const teks = (f["SOAL"] ?? "").trim();
    const jawaban = (f["JAWABAN"] ?? "")
      .split(/[|\n]/)
      .map((s) => s.trim())
      .filter(Boolean);

    let jenis: JenisSoal | null;
    if ((f["JENIS"] ?? "").trim() !== "") {
      jenis = bacaJenis(f["JENIS"]);
      if (!jenis) return gagal(`Jenis "${f["JENIS"].trim()}" tidak dikenal. Pakai pg, isian, atau esai.`);
    } else {
      jenis = opsi.length > 0 ? "pilihan_ganda" : jawaban.length > 0 ? "isian" : "esai";
    }

    let bobot = 1;
    if ((f["BOBOT"] ?? "").trim() !== "") {
      bobot = Number(f["BOBOT"].trim().replace(",", "."));
      if (!Number.isFinite(bobot) || bobot <= 0) return gagal("Bobot harus angka lebih dari 0.");
    }

    if (teks.length < 3) return gagal("Teks soal kosong atau terlalu pendek (isi baris SOAL:).");

    const pembahasan = (f["PEMBAHASAN"] ?? "").trim();
    let kunci_index = -1;
    let daftarOpsi: string[] = [];
    let jawabanIsian: string[] = [];
    let rubrik = "";

    if (jenis === "pilihan_ganda") {
      if (opsi.length < 2) return gagal("Pilihan ganda butuh minimal 2 opsi (A. ..., B. ...).");
      if (opsi.length > 10) return gagal("Maksimal 10 opsi.");
      if (new Set(opsi.map((x) => x.huruf)).size !== opsi.length) {
        return gagal("Ada huruf opsi yang dobel.");
      }
      if (opsi.some((x) => !x.teks)) return gagal("Ada opsi yang kosong.");
      const huruf = (f["KUNCI"] ?? "").trim().toUpperCase().replace(/[.)]$/, "");
      kunci_index = opsi.findIndex((x) => x.huruf === huruf);
      if (kunci_index < 0) {
        return gagal(
          huruf
            ? `Kunci "${huruf}" tidak cocok dengan opsi yang ada.`
            : "Baris KUNCI: belum diisi (contoh: KUNCI: B).",
        );
      }
      daftarOpsi = opsi.map((x) => x.teks);
    } else if (jenis === "isian") {
      if (jawaban.length === 0) return gagal("Soal isian butuh baris JAWABAN: ... (pisahkan varian dengan |).");
      jawabanIsian = jawaban;
    } else {
      rubrik = (f["RUBRIK"] ?? "").trim();
    }

    soal.push({
      jenis,
      teks,
      opsi: daftarOpsi,
      kunci_index,
      jawaban_isian: jawabanIsian,
      bobot,
      rubrik,
      pembahasan,
    });
  });

  return { soal, galat };
}
