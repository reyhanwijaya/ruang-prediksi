"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { Hasil } from "@/lib/types";

/** Tombol hapus dengan dialog konfirmasi. `aksi` adalah server action yang dibungkus fungsi. */
export function HapusTombol({
  judul,
  deskripsi,
  aksi,
  label,
  konfirmasi = "Ya, hapus",
  proses: teksProses = "Menghapus…",
}: {
  judul: string;
  deskripsi: string;
  aksi: () => Promise<Hasil>;
  label?: string;
  konfirmasi?: string;
  proses?: string;
}) {
  const [buka, setBuka] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [proses, mulai] = useTransition();

  function tutup() {
    setBuka(false);
    setGalat(null);
  }

  function hapus() {
    setGalat(null);
    mulai(async () => {
      const r = await aksi();
      if (!r.ok) setGalat(r.error);
      else tutup();
    });
  }

  return (
    <>
      <Button
        variant="danger-soft"
        size={label ? "sm" : "icon"}
        aria-label={label ?? "Hapus"}
        title={label ?? "Hapus"}
        onClick={() => setBuka(true)}
        className={label ? undefined : "size-9"}
      >
        <Trash2 className="size-4" />
        {label}
      </Button>
      <Dialog open={buka} onClose={tutup} judul={judul} deskripsi={deskripsi}>
        {galat && (
          <p className="mb-4 rounded-xl bg-danger/15 px-3.5 py-2.5 text-sm font-medium text-[#b23b3b] dark:text-danger">
            {galat}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={tutup} disabled={proses}>
            Batal
          </Button>
          <Button variant="danger" onClick={hapus} disabled={proses}>
            {proses ? teksProses : konfirmasi}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
