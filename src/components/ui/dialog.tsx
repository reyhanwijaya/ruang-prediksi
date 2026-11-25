"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/** Dialog memakai elemen <dialog> bawaan browser (fokus terkunci, tombol Esc berfungsi). */
export function Dialog({
  open,
  onClose,
  judul,
  deskripsi,
  children,
}: {
  open: boolean;
  onClose: () => void;
  judul: string;
  deskripsi?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-0 text-foreground shadow-xl backdrop:bg-black/40"
    >
      {open && (
        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-primary-deep">{judul}</h2>
              {deskripsi && <p className="mt-0.5 text-sm text-muted-foreground">{deskripsi}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="-mr-1.5 -mt-1.5 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
            >
              <X className="size-5" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
