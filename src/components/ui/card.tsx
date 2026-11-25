import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5", className)}
      {...props}
    />
  );
}

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      tone: {
        netral: "bg-muted text-muted-foreground",
        biru: "bg-primary-soft text-primary-deep",
        hijau: "bg-success/20 text-[#1f6b3f] dark:text-success",
        oranye: "bg-warning/20 text-[#8a4a12] dark:text-warning",
        merah: "bg-danger/15 text-[#b23b3b] dark:text-danger",
        kuning: "bg-accent/40 text-[#6b5200] dark:text-accent",
      },
    },
    defaultVariants: { tone: "netral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export function EmptyState({
  ikon,
  judul,
  children,
}: {
  ikon?: React.ReactNode;
  judul: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/50 px-6 py-12 text-center">
      {ikon && <div className="mb-3 text-primary">{ikon}</div>}
      <p className="font-semibold text-foreground">{judul}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function PageHeader({
  judul,
  deskripsi,
  aksi,
}: {
  judul: string;
  deskripsi?: string;
  aksi?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-extrabold tracking-tight text-primary-deep sm:text-2xl">{judul}</h1>
        {deskripsi && <p className="mt-1 text-sm text-muted-foreground">{deskripsi}</p>}
      </div>
      {aksi && <div className="flex flex-wrap items-center gap-2">{aksi}</div>}
    </div>
  );
}
