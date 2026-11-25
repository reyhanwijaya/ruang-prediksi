import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { OpsiSoal, SoalForm as BentukForm } from "@/lib/types";
import { HURUF_OPSI } from "@/lib/utils";
import { SoalForm } from "./soal-form";

export const metadata: Metadata = { title: "Soal" };

export default async function HalamanSoal({
  params,
}: {
  params: Promise<{ id: string; soalId: string }>;
}) {
  const { id, soalId } = await params;
  const db = await createClient();

  const { data: ujian } = await db.from("ujian").select("id,judul").eq("id", id).maybeSingle();
  if (!ujian) notFound();

  if (soalId === "baru") {
    const { data: terakhir } = await db
      .from("soal")
      .select("nomor")
      .eq("ujian_id", id)
      .order("nomor", { ascending: false })
      .limit(1)
      .maybeSingle();
    return <SoalForm ujianId={id} judulUjian={ujian.judul} nomor={(terakhir?.nomor ?? 0) + 1} />;
  }

  const { data: s } = await db.from("soal").select("*").eq("id", soalId).eq("ujian_id", id).maybeSingle();
  if (!s) notFound();

  const opsi = ((s.opsi ?? []) as OpsiSoal[]).map((o) => o.teks);
  const awal: BentukForm = {
    jenis: s.jenis,
    teks: s.teks,
    gambar: s.gambar_url ?? "",
    bobot: String(Number(s.bobot)),
    opsi: opsi.length ? opsi : ["", "", "", "", ""],
    opsiGambar: ((s.opsi ?? []) as OpsiSoal[]).map((o) => o.gambar ?? ""),
    kunci: s.kunci ? HURUF_OPSI.indexOf(s.kunci) : -1,
    jawaban: (s.jawaban_isian ?? []) as string[],
    rubrik: s.rubrik ?? "",
    pembahasan: s.pembahasan ?? "",
  };

  return <SoalForm ujianId={id} judulUjian={ujian.judul} soalId={s.id} nomor={s.nomor} awal={awal} />;
}
