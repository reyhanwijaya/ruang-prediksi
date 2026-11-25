"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { UjianForm } from "@/components/ujian-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { Ujian } from "@/lib/types";

export function UjianPengaturan({
  ujian,
  kategori,
}: {
  ujian: Ujian;
  kategori: { id: string; nama: string }[];
}) {
  const [buka, setBuka] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setBuka(true)}>
        <Settings2 className="size-4" />
        Pengaturan ujian
      </Button>
      <Dialog open={buka} onClose={() => setBuka(false)} judul="Pengaturan ujian">
        <UjianForm kategori={kategori} awal={ujian} onSelesai={() => setBuka(false)} />
      </Dialog>
    </>
  );
}
