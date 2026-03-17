"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  Building2,
  Container,
  Crosshair,
  Map,
  Radar,
  ShipWheel,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/control-tower", label: "Torre de Controle", icon: Crosshair },
  { href: "/yard-operations", label: "Patio e Docas", icon: Map },
  { href: "/occurrences", label: "Ocorrencias", icon: AlertTriangle },
  { href: "/containers", label: "Conteineres", icon: Container },
  { href: "/ships", label: "Navios", icon: ShipWheel },
  { href: "/carriers", label: "Transportadoras", icon: Building2 },
  { href: "/tracking", label: "Rastreamento", icon: Radar },
  { href: "/simulation", label: "Simulation Center", icon: Boxes },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="grid gap-8 rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,#0b1f33_0%,#0d2a45_45%,#123956_100%)] p-6 text-sidebar-foreground soft-shadow lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 font-display text-lg font-semibold">
            PF
          </div>
          <div>
            <p className="font-display text-xl font-semibold">PortFlow</p>
            <p className="text-sm text-white/60">Port Ops Control</p>
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/6 p-4 text-sm leading-6 text-white/75">
          Operacao ponta a ponta para patio portuario, fiscalizacao, transporte,
          ocorrencias e entrega final.
        </div>
      </div>

      <nav className="grid gap-2">
        {navigation.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                active
                  ? "bg-white text-sidebar shadow-lg shadow-slate-950/20"
                  : "text-white/72 hover:bg-white/8 hover:text-white",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-3xl border border-accent/20 bg-accent/12 p-4 text-sm text-white/80">
        <p className="font-semibold text-white">Ambiente demonstrativo</p>
        <p className="mt-1 text-white/70">
          Dados mockados com fluxo autonomo, patio vivo, torre de controle e compatibilidade com GitHub Pages.
        </p>
      </div>
    </aside>
  );
}
