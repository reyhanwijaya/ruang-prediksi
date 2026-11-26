"use client";

import { useState } from "react";

/* Grafik ringan tanpa pustaka tambahan. Satu seri berwarna --solid (biru tema),
   nilai selalu terbaca lewat label/tooltip/tabel, bukan hanya warna. */

export interface DataBatang {
  label: string;
  nilai: number;
  catatan?: string;
}

/** Batang horizontal: satu baris per kategori, nilai tertulis di ujung batang. */
export function GrafikBatang({ data, maks = 100, satuan = "" }: { data: DataBatang[]; maks?: number; satuan?: string }) {
  const [aktif, setAktif] = useState<number | null>(null);
  return (
    <ul className="space-y-3" aria-label="Grafik batang">
      {data.map((d, i) => {
        const lebar = Math.max(0, Math.min(100, (d.nilai / maks) * 100));
        const ket = `${d.label}: ${d.nilai}${satuan}${d.catatan ? ` (${d.catatan})` : ""}`;
        return (
          <li
            key={d.label + i}
            tabIndex={0}
            aria-label={ket}
            title={ket}
            onPointerEnter={() => setAktif(i)}
            onPointerLeave={() => setAktif(null)}
            onFocus={() => setAktif(i)}
            onBlur={() => setAktif(null)}
            className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-semibold">{d.label}</span>
              <span className="shrink-0 font-extrabold tabular-nums text-primary-deep">
                {d.nilai}
                {satuan}
                {d.catatan && <span className="ml-1.5 text-xs font-medium text-muted-foreground">{d.catatan}</span>}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-r-[4px] rounded-l-sm bg-muted">
              <div
                className="h-full rounded-r-[4px] bg-solid transition-[width,opacity]"
                style={{ width: `${lebar}%`, opacity: aktif === null || aktif === i ? 1 : 0.55 }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export interface TitikTren {
  tanggal: string; // YYYY-MM-DD
  jumlah: number;
}

function labelTanggal(t: string, panjang = false) {
  return new Date(t + "T00:00:00Z").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    ...(panjang ? { weekday: "short" as const } : {}),
    timeZone: "UTC",
  });
}

function batasAtas(n: number) {
  if (n <= 4) return 4;
  const langkah = n <= 10 ? 2 : n <= 40 ? 5 : 10 ** Math.floor(Math.log10(n));
  return Math.ceil(n / langkah / 4) * langkah * 4;
}

const L = 640;
const T = 200;
const PAD = { kiri: 34, kanan: 12, atas: 12, bawah: 26 };

/** Garis tren harian dengan garis bidik + tooltip (pointer dan keyboard). */
export function GrafikTren({ data, satuan = "sesi" }: { data: TitikTren[]; satuan?: string }) {
  const [idx, setIdx] = useState<number | null>(null);
  const n = data.length;
  const maks = batasAtas(Math.max(1, ...data.map((d) => d.jumlah)));
  const lebarIsi = L - PAD.kiri - PAD.kanan;
  const tinggiIsi = T - PAD.atas - PAD.bawah;
  const x = (i: number) => PAD.kiri + (n === 1 ? lebarIsi / 2 : (i / (n - 1)) * lebarIsi);
  const y = (v: number) => PAD.atas + tinggiIsi - (v / maks) * tinggiIsi;
  const garis = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.jumlah).toFixed(1)}`).join(" ");
  const total = data.reduce((a, d) => a + d.jumlah, 0);

  function dariPointer(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * L;
    const i = Math.round(((px - PAD.kiri) / lebarIsi) * (n - 1));
    setIdx(Math.max(0, Math.min(n - 1, i)));
  }

  function tombol(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, (i ?? n) - 1));
    else if (e.key === "ArrowRight") setIdx((i) => Math.min(n - 1, (i ?? -1) + 1));
    else if (e.key === "Escape") setIdx(null);
  }

  const kolomX = [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i && n > 0);
  const aktif = idx !== null ? data[idx] : null;

  return (
    <div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${L} ${T}`}
          className="h-auto w-full touch-pan-y select-none outline-none focus-visible:ring-2 focus-visible:ring-primary"
          role="img"
          tabIndex={0}
          aria-label={`Pemakaian per hari selama ${n} hari terakhir, total ${total} ${satuan}. Gunakan panah kiri dan kanan untuk membaca tiap hari.`}
          onPointerMove={dariPointer}
          onPointerDown={dariPointer}
          onPointerLeave={() => setIdx(null)}
          onBlur={() => setIdx(null)}
          onKeyDown={tombol}
        >
          {/* garis kisi yang redup */}
          {[0, 1, 2, 3, 4].map((k) => {
            const v = (maks / 4) * k;
            return (
              <g key={k}>
                <line x1={PAD.kiri} x2={L - PAD.kanan} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth={1} />
                <text x={PAD.kiri - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--muted-foreground)">
                  {v}
                </text>
              </g>
            );
          })}
          {kolomX.map((i) => (
            <text
              key={i}
              x={x(i)}
              y={T - 6}
              textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
              fontSize={11}
              fill="var(--muted-foreground)"
            >
              {labelTanggal(data[i].tanggal)}
            </text>
          ))}

          <path d={garis} fill="none" stroke="var(--solid)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {idx !== null && (
            <g>
              <line x1={x(idx)} x2={x(idx)} y1={PAD.atas} y2={PAD.atas + tinggiIsi} stroke="var(--muted-foreground)" strokeWidth={1} strokeDasharray="3 3" />
              <circle cx={x(idx)} cy={y(data[idx].jumlah)} r={5} fill="var(--solid)" stroke="var(--card)" strokeWidth={2} />
            </g>
          )}
          {/* titik akhir selalu ditandai */}
          {idx === null && n > 0 && (
            <circle cx={x(n - 1)} cy={y(data[n - 1].jumlah)} r={4} fill="var(--solid)" stroke="var(--card)" strokeWidth={2} />
          )}
        </svg>

        {aktif && idx !== null && (
          <div
            className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs shadow-md"
            style={{ left: `${Math.min(88, Math.max(12, (x(idx) / L) * 100))}%` }}
            role="status"
          >
            <p className="font-extrabold tabular-nums text-foreground">
              {aktif.jumlah} {satuan}
            </p>
            <p className="text-muted-foreground">{labelTanggal(aktif.tanggal, true)}</p>
          </div>
        )}
      </div>

      <details className="mt-2 text-xs">
        <summary className="cursor-pointer font-semibold text-primary-deep">Lihat sebagai tabel</summary>
        <table className="mt-2 w-full">
          <tbody>
            {data.map((d) => (
              <tr key={d.tanggal} className="border-t border-border">
                <td className="py-1 text-muted-foreground">{labelTanggal(d.tanggal, true)}</td>
                <td className="py-1 text-right font-semibold tabular-nums">{d.jumlah}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
