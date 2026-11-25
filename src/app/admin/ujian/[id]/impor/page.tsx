import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ImporForm } from "./impor-form";

export const metadata: Metadata = { title: "Tempel banyak soal" };

export default async function HalamanImpor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createClient();
  const { data: ujian } = await db.from("ujian").select("id,judul").eq("id", id).maybeSingle();
  if (!ujian) notFound();

  return <ImporForm ujianId={id} judulUjian={ujian.judul} />;
}
