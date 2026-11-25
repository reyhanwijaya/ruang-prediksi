// Memecah teks soal menjadi potongan teks biasa dan rumus ($...$ atau $$...$$). \$ = tanda dolar biasa.

export interface Potongan {
  tipe: "teks" | "rumus" | "blok";
  isi: string;
}

const TANDA = "\u0000";

export function pecahTeks(mentah: string): Potongan[] {
  const aman = mentah.replace(/\\\$/g, TANDA);
  const hasil: Potongan[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let akhir = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(aman)) !== null) {
    if (m.index > akhir) hasil.push({ tipe: "teks", isi: aman.slice(akhir, m.index) });
    if (m[1] !== undefined) hasil.push({ tipe: "blok", isi: m[1].trim() });
    else hasil.push({ tipe: "rumus", isi: m[2].trim() });
    akhir = m.index + m[0].length;
  }
  if (akhir < aman.length) hasil.push({ tipe: "teks", isi: aman.slice(akhir) });

  return hasil.map((p) => ({
    ...p,
    isi: p.isi.split(TANDA).join(p.tipe === "teks" ? "$" : "\\$"),
  }));
}
