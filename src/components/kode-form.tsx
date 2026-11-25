"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { pakaiKode } from "@/app/(peserta)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { bersihkanKode } from "@/lib/utils";

/** Form kode ujian: memeriksa kode di server lalu membuka halaman ujian. */
export function KodeForm() {
  const router = useRouter();
  const [kode, setKode] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [lanjutId, setLanjutId] = useState<string | null>(null);
  const [proses, mulai] = useTransition();

  function kirim(e: React.FormEvent) {
    e.preventDefault();
    if (kode.length !== 8 || proses) return;
    setGalat(null);
    setLanjutId(null);
    mulai(async () => {
      const r = await pakaiKode(kode);
      if (r.ok) {
        router.push(`/ujian/${r.id}`);
      } else {
        setGalat(r.pesan);
        setLanjutId(r.lanjutId ?? null);
      }
    });
  }

  return (
    <form onSubmit={kirim} className="space-y-3">
      <Input
        value={kode}
        onChange={(e) => {
          setKode(bersihkanKode(e.target.value));
          setGalat(null);
          setLanjutId(null);
        }}
        placeholder="KODE8HRF"
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        maxLength={8}
        aria-label="Kode ujian"
        aria-invalid={galat ? true : undefined}
        className="h-14 text-center font-mono text-xl font-bold uppercase tracking-[0.35em] placeholder:font-normal placeholder:tracking-[0.35em]"
      />
      <Button type="submit" size="lg" className="w-full" disabled={kode.length !== 8 || proses}>
        {proses ? "Memeriksa kode…" : "Mulai ujian"}
        {!proses && <ArrowRight className="size-5" />}
      </Button>
      <p className="text-center text-xs text-muted-foreground">{kode.length}/8 karakter</p>
      {galat && (
        <p role="alert" className="rounded-xl bg-danger/15 px-3.5 py-2.5 text-sm font-medium text-[#b23b3b] dark:text-danger">
          {galat}
          {lanjutId && (
            <>
              {" "}
              <Link href={`/ujian/${lanjutId}`} className="font-bold underline">
                Lanjutkan ujian
              </Link>
            </>
          )}
        </p>
      )}
    </form>
  );
}
