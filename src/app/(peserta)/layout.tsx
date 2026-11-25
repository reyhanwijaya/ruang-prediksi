import { PesertaShell } from "@/components/peserta-shell";
import { requireProfile } from "@/lib/auth";

export default async function LayoutPeserta({ children }: { children: React.ReactNode }) {
  const profil = await requireProfile();

  return (
    <PesertaShell
      nama={profil.nama}
      email={profil.email}
      foto={profil.foto_url}
      isAdmin={profil.peran === "admin"}
    >
      {children}
    </PesertaShell>
  );
}
