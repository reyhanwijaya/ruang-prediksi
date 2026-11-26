"use client";

import { useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { resetPemakaian } from "@/app/admin/kode/actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/form";

/** Tombol + dialog reset pemakaian satu peserta (alasan wajib, dicatat di log admin). */
export function TombolReset({ pemakaianId, nama }: { pemakaianId: string; nama: string }) {
  const [buka, setBuka] = useState(false);
  const [alasan, setAlasan] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [proses, mulai] = useTransition();

  function tutup() {
    setBuka(false);
    setAlasan("");
    setGalat(null);
  }

  function kirim(e: React.FormEvent) {
    e.preventDefault();
    setGalat(null);
    mulai(async () => {
      const r = await resetPemakaian(pemakaianId, alasan);
      if (!r.ok) setGalat(r.error);
      else tutup();
    });
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setBuka(true)}>
        <RotateCcw className="size-4" /> Reset
      </Button>
      <Dialog
        open={buka}
        onClose={tutup}
        judul="Reset pemakaian?"
        deskripsi={`Pemakaian ${nama} beserta jawaban dan skornya dihapus, sehingga kuota kembali dan ia bisa mengerjakan lagi. Tindakan ini dicatat.`}
      >
        <form onSubmit={kirim} className="space-y-4">
          <Field label="Alasan reset (wajib)">
            <Textarea value={alasan} onChange={(e) => setAlasan(e.target.value)} rows={3} maxLength={300} />
          </Field>
          {galat && (
            <p className="rounded-xl bg-danger/15 px-3.5 py-2.5 text-sm font-medium text-[#b23b3b] dark:text-danger">{galat}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={tutup} disabled={proses}>
              Batal
            </Button>
            <Button type="submit" variant="danger" disabled={proses}>
              {proses ? "Mereset…" : "Ya, reset"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
