"use client";

import { useQuery } from "@tanstack/react-query";
import { Bell, LogOut, Search, TimerReset, Waves } from "lucide-react";
import { useRouter } from "next/navigation";
import { DEMO_SCENARIO_LABELS } from "@/lib/demo-runtime";
import { formatDateTime } from "@/lib/formatters";
import { getDashboardOverview } from "@/services/dashboard-service";
import { getSimulationRuntime } from "@/services/simulations-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "./auth-provider";

export function Topbar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { data } = useQuery({
    queryKey: ["dashboard-overview-topbar"],
    queryFn: getDashboardOverview,
  });
  const runtimeQuery = useQuery({
    queryKey: ["simulation-runtime-topbar"],
    queryFn: getSimulationRuntime,
  });

  return (
    <div className="page-fade flex flex-col gap-4 rounded-[30px] border border-white/80 bg-white/90 p-5 soft-shadow lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3 rounded-2xl bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
          <Waves className="size-4 text-primary" />
          Operacao de Santos em monitoramento autonomo
        </div>
        <div className="grid gap-1">
          <p className="font-display text-xl font-semibold">Boa operacao, {user?.name}</p>
          <p className="text-sm text-muted-foreground">
            {data
              ? `${data.kpis.containersInPort} conteineres no porto, ${data.kpis.containersInTransport} em transito e ${data.kpis.openOccurrences} ocorrencias abertas.`
              : "Sincronizando indicadores da operacao."}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {runtimeQuery.data ? (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-white/80 px-4 py-3 text-xs text-muted-foreground">
            <TimerReset className="size-4 text-primary" />
            <span>{formatDateTime(runtimeQuery.data.currentTime)}</span>
            <span>{DEMO_SCENARIO_LABELS[runtimeQuery.data.scenario]}</span>
            <span>Tick #{runtimeQuery.data.tick}</span>
          </div>
        ) : null}
        <div className="relative min-w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-10" placeholder="Busca rapida por cliente, carga ou codigo" />
        </div>
        <Button variant="ghost" size="icon" aria-label="Notificacoes">
          <Bell className="size-4" />
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            logout();
            router.replace("/login");
          }}
        >
          <LogOut className="size-4" />
          Sair
        </Button>
      </div>
    </div>
  );
}
