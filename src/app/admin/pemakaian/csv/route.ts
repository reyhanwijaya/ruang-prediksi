import { NextResponse, type NextRequest } from "next/server";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ambilPemakaian, bacaFilter, satu } from "@/lib/pemakaian-query";
import { formatTanggal } from "@/lib/utils";

const BATAS = 5000;
const STATUS_LABEL: Record<string, string> = {
  berjalan: "Berjalan",
  selesai: "Selesai",
  dikunci: "Dikunci",
  waktu_habis: "Waktu habis",
};

// Pemisah titik koma dipakai agar langsung terbuka rapi di Excel berbahasa Indonesia.
function sel(v: unknown) {
  let s = v === null || v === undefined ? "" : String(v);
  // cegah rumus berbahaya saat dibuka di Excel/Sheets
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const profil = await getProfile();
  if (!profil || profil.peran !== "admin") return new NextResponse("Hanya admin.", { status: 403 });

  const f = bacaFilter(Object.fromEntries(req.nextUrl.searchParams));
  const db = await createClient();

  const baris: string[] = [
    ["Nama", "Email", "Ujian", "Kode", "Status", "Skor", "Jumlah benar", "Pelanggaran", "Mulai (WIB)", "Selesai (WIB)"]
      .map(sel)
      .join(";"),
  ];

  for (let dari = 0; dari < BATAS; dari += 1000) {
    const { rows } = await ambilPemakaian(db, f, dari, dari + 999);
    for (const r of rows) {
      const pr = satu(r.profiles);
      baris.push(
        [
          pr?.nama ?? "",
          pr?.email ?? "",
          satu(r.ujian)?.judul ?? "",
          satu(r.kode_ujian)?.kode ?? "",
          STATUS_LABEL[r.status] ?? r.status,
          r.skor === null ? "" : Math.round(Number(r.skor)),
          r.jumlah_benar,
          r.pelanggaran,
          r.mulai_pada ? formatTanggal(r.mulai_pada) : "",
          r.selesai_pada ? formatTanggal(r.selesai_pada) : "",
        ]
          .map(sel)
          .join(";"),
      );
    }
    if (rows.length < 1000) break;
  }

  const tgl = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
  return new NextResponse("﻿" + baris.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pemakaian-${tgl}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
