import { Badge } from "@/components/ui/card";
import { STATUS_LABEL } from "@/lib/utils";
import type { StatusKonten } from "@/lib/types";

const NADA = { draf: "kuning", terbit: "hijau", arsip: "netral" } as const;

export function StatusBadge({ status }: { status: StatusKonten }) {
  return <Badge tone={NADA[status]}>{STATUS_LABEL[status]}</Badge>;
}
