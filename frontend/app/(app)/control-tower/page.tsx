"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Crosshair,
  PlayCircle,
  Radar,
  ShieldAlert,
  ShipWheel,
  Truck,
  Warehouse,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/app/auth-provider";
import { OccurrenceSeverityBadge, OccurrenceStatusBadge } from "@/components/app/occurrence-badges";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatOccurrenceCategory, formatStatusLabel } from "@/lib/formatters";
import { getErrorMessage } from "@/services/api-client";
import { getControlTowerOverview } from "@/services/control-tower-service";
import { assignOccurrence, updateOccurrenceStatus } from "@/services/occurrences-service";
import {
  runSimulationCycle,
  simulateCustomsRelease,
  simulateDelivery,
  simulateDispatch,
  simulateShipArrival,
} from "@/services/simulations-service";
import type {
  ControlTowerPriorityItem,
  ControlTowerTone,
  OperationalOccurrence,
} from "@/types/api";

const toneClasses: Record<ControlTowerTone, string> = {
  STABLE: "border-emerald-400/20 bg-emerald-400/12 text-emerald-50",
  WATCH: "border-amber-300/25 bg-amber-300/12 text-amber-50",
  CRITICAL: "border-rose-300/25 bg-rose-400/14 text-rose-50",
};

const manualCycleItem: ControlTowerPriorityItem = {
  id: "manual-cycle",
  title: "Avanco manual",
  description: "Sincronizacao manual do proximo ciclo.",
  severity: "LOW",
  occurrenceId: null,
  occurrenceStatus: null,
  dueAt: null,
  ownerName: null,
  sourceLabel: "Motor autonomo",
  actionType: "ADVANCE_CYCLE",
  actionLabel: "Avancar 1 ciclo",
  targetId: null,
  routeHref: "/simulation",
  category: null,
};

export default function ControlTowerPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const controlTowerQuery = useQuery({
    queryKey: ["control-tower-overview"],
    queryFn: getControlTowerOverview,
  });

  function syncControlTower(message?: string) {
    if (message) {
      toast.success(message);
    }

    queryClient.invalidateQueries({ queryKey: ["control-tower-overview"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-overview-occurrences"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-overview-topbar"] });
    queryClient.invalidateQueries({ queryKey: ["occurrences"] });
    queryClient.invalidateQueries({ queryKey: ["occurrences-summary"] });
    queryClient.invalidateQueries({ queryKey: ["simulation-runtime"] });
    queryClient.invalidateQueries({ queryKey: ["simulation-runtime-topbar"] });
    queryClient.invalidateQueries({ queryKey: ["simulation-ships"] });
    queryClient.invalidateQueries({ queryKey: ["simulation-containers"] });
    queryClient.invalidateQueries({ queryKey: ["containers"] });
    queryClient.invalidateQueries({ queryKey: ["ships"] });
    queryClient.invalidateQueries({ queryKey: ["tracking"] });
  }

  const assignMutation = useMutation({
    mutationFn: ({ occurrenceId, ownerName }: { occurrenceId: string; ownerName: string }) =>
      assignOccurrence(occurrenceId, ownerName),
    onSuccess: () => syncControlTower("Ocorrencia assumida pela torre de controle."),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const resolveMutation = useMutation({
    mutationFn: (occurrenceId: string) =>
      updateOccurrenceStatus(
        occurrenceId,
        "RESOLVED",
        "Tratativa encerrada manualmente pela torre de controle.",
      ),
    onSuccess: () => syncControlTower("Ocorrencia encerrada manualmente."),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const actionMutation = useMutation({
    mutationFn: async (item: ControlTowerPriorityItem) => {
      if (item.actionType === "SHIP_ARRIVAL" && item.targetId) {
        return simulateShipArrival(item.targetId);
      }

      if (item.actionType === "CUSTOMS_RELEASE" && item.targetId) {
        return simulateCustomsRelease(item.targetId);
      }

      if (item.actionType === "DISPATCH" && item.targetId) {
        return simulateDispatch(item.targetId);
      }

      if (item.actionType === "DELIVERY" && item.targetId) {
        return simulateDelivery(item.targetId);
      }

      return runSimulationCycle(1);
    },
    onSuccess: (_, item) => syncControlTower(getActionSuccessMessage(item.actionType)),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const data = controlTowerQuery.data;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Orquestracao do turno"
        title="Torre de Controle Operacional"
        description="Fila de acao priorizada, vigilancia de SLA e gargalos do fluxo reunidos em uma unica visao para a mesa operacional."
        actions={(
          <>
            <Button
              variant="outline"
              onClick={() => actionMutation.mutate(manualCycleItem)}
              disabled={actionMutation.isPending}
            >
              <PlayCircle className="size-4" />
              Avancar 1 ciclo
            </Button>
            <Button asChild>
              <Link href="/simulation">
                <Radar className="size-4" />
                Abrir Simulation Center
              </Link>
            </Button>
          </>
        )}
      />

      {controlTowerQuery.isLoading || !data ? (
        <Card>
          <CardContent className="p-10 text-sm text-muted-foreground">
            Montando a torre de controle da operacao...
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="overflow-hidden border-none bg-[linear-gradient(135deg,#071321_0%,#0c2338_48%,#12334d_100%)] text-white">
              <CardContent className="grid gap-8 p-6 xl:grid-cols-[0.75fr_1.25fr] xl:p-8">
                <div className="space-y-5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                    <Crosshair className="size-3.5" />
                    Mesa do turno
                  </div>
                  <div className="flex items-end gap-4">
                    <div className="grid h-28 w-28 place-items-center rounded-full border border-white/15 bg-white/8 shadow-[inset_0_0_0_12px_rgba(255,255,255,0.03)]">
                      <div className="text-center">
                        <p className="font-display text-4xl font-semibold">{data.readinessScore}</p>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                          score
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/70">
                        {data.pressureLabel}
                      </p>
                      <h2 className="font-display text-3xl font-semibold tracking-tight">
                        Prontidao operacional
                      </h2>
                      <p className="max-w-md text-sm leading-6 text-white/70">
                        {data.primaryFocus}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <HeroMeta label="Relogio" value={formatDateTime(data.currentTime)} />
                    <HeroMeta label="Cenario" value={data.scenarioLabel} />
                    <HeroMeta
                      label="Motor"
                      value={data.isRunning ? "Execucao continua" : "Pausado"}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {data.lanePressure.map((lane) => (
                    <div
                      key={lane.id}
                      className={[
                        "rounded-3xl border p-4",
                        toneClasses[lane.tone],
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                            {lane.title}
                          </p>
                          <p className="mt-3 font-display text-3xl font-semibold">{lane.total}</p>
                        </div>
                        <div className="rounded-2xl bg-black/15 p-3">
                          {lane.title === "Atracacao" ? (
                            <ShipWheel className="size-5" />
                          ) : lane.title === "Fiscalizacao" ? (
                            <ShieldAlert className="size-5" />
                          ) : lane.title === "Expedicao" ? (
                            <Warehouse className="size-5" />
                          ) : (
                            <Truck className="size-5" />
                          )}
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-white/72">{lane.helper}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              <StatCard
                title="Fila de acao"
                value={String(data.kpis.actionQueue)}
                helper="Itens priorizados para execucao imediata do turno"
                icon={AlertTriangle}
              />
              <StatCard
                title="SLAs estourados"
                value={String(data.kpis.overdueSlas)}
                helper="Ocorrencias com vencimento ultrapassado"
                icon={ShieldAlert}
              />
              <StatCard
                title="Vencendo em 2h"
                value={String(data.kpis.dueSoonSlas)}
                helper="Tratativas que exigem acao antes da janela expirar"
                icon={Clock3}
              />
              <StatCard
                title="Encerradas em 24h"
                value={String(data.kpis.resolvedLast24h)}
                helper="Capacidade recente de resposta da operacao"
                icon={CheckCircle2}
              />
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle>Fila priorizada do turno</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Acoes recomendadas automaticamente pelo PortFlow com base em ocorrencias,
                  gargalos e ritmo do fluxo autonomo.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.priorityQueue.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-border/80 bg-white/75 p-5"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <OccurrenceSeverityBadge value={item.severity} />
                          {item.occurrenceStatus ? (
                            <OccurrenceStatusBadge value={item.occurrenceStatus} />
                          ) : null}
                          {item.category ? (
                            <span className="text-xs font-medium text-muted-foreground">
                              {formatOccurrenceCategory(item.category)}
                            </span>
                          ) : null}
                        </div>
                        <div>
                          <p className="font-display text-xl font-semibold">{item.title}</p>
                          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs font-medium text-muted-foreground">
                          <span>Origem: {item.sourceLabel}</span>
                          <span>{formatDeadlineLabel(item.dueAt, data.currentTime)}</span>
                          <span>
                            Responsavel: {item.ownerName ?? "Mesa ainda nao designada"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 xl:w-[240px]">
                        {item.occurrenceId && !item.ownerName ? (
                          <Button
                            variant="secondary"
                            onClick={() =>
                              assignMutation.mutate({
                                occurrenceId: item.occurrenceId!,
                                ownerName: user?.name ?? "Ops Desk",
                              })
                            }
                            disabled={assignMutation.isPending}
                          >
                            Assumir tratativa
                          </Button>
                        ) : null}
                        <Button
                          onClick={() => actionMutation.mutate(item)}
                          disabled={actionMutation.isPending}
                        >
                          {item.actionLabel}
                        </Button>
                        {item.occurrenceId && item.occurrenceStatus !== "RESOLVED" ? (
                          <Button
                            variant="outline"
                            onClick={() => resolveMutation.mutate(item.occurrenceId!)}
                            disabled={resolveMutation.isPending}
                          >
                            Encerrar manualmente
                          </Button>
                        ) : null}
                        <Button asChild variant="outline">
                          <Link href={item.routeHref}>
                            Abrir contexto
                            <ArrowRight className="size-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Vigilancia de SLA</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
                  <SlaColumn
                    title="Estourados"
                    tone="critical"
                    items={data.slaWatch.overdue}
                    currentTime={data.currentTime}
                    emptyLabel="Nenhum SLA vencido no momento."
                  />
                  <SlaColumn
                    title="Ate 2h"
                    tone="watch"
                    items={data.slaWatch.dueSoon}
                    currentTime={data.currentTime}
                    emptyLabel="Sem tratativas vencendo nas proximas 2 horas."
                  />
                  <SlaColumn
                    title="Sob controle"
                    tone="stable"
                    items={data.slaWatch.onTrack}
                    currentTime={data.currentTime}
                    emptyLabel="As ocorrencias restantes seguem dentro do combinado."
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Radar da operacao</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-5">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Navios proximos
                    </p>
                    {data.shipsApproaching.length === 0 ? (
                      <EmptyState label="Nenhuma escala sensivel nas proximas 12 horas." />
                    ) : (
                      data.shipsApproaching.map((ship) => (
                        <div
                          key={ship.id}
                          className="rounded-2xl border border-border/80 bg-secondary/35 p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold">{ship.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {ship.origin} - {ship.destination}
                              </p>
                            </div>
                            <StatusBadge value={ship.status} />
                          </div>
                          <p className="mt-3 text-xs font-medium text-muted-foreground">
                            ETA {formatDateTime(ship.eta)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Conteineres em atencao
                    </p>
                    {data.containersNeedingAttention.length === 0 ? (
                      <EmptyState label="Nenhuma unidade critica alem da fila priorizada." />
                    ) : (
                      data.containersNeedingAttention.map((container) => (
                        <div
                          key={container.id}
                          className="rounded-2xl border border-border/80 bg-secondary/35 p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold">{container.containerCode}</p>
                              <p className="text-sm text-muted-foreground">
                                {container.clientName} - {container.destination}
                              </p>
                            </div>
                            <StatusBadge value={container.status} />
                          </div>
                          <p className="mt-3 text-xs font-medium text-muted-foreground">
                            {formatStatusLabel(container.type)} | ETA {formatDateTime(container.eta)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function HeroMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/6 p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">{label}</p>
      <p className="mt-2 font-display text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function SlaColumn({
  title,
  tone,
  items,
  currentTime,
  emptyLabel,
}: {
  title: string;
  tone: "critical" | "watch" | "stable";
  items: OperationalOccurrence[];
  currentTime: string;
  emptyLabel: string;
}) {
  const classes = tone === "critical"
    ? "border-rose-300/35 bg-rose-400/10"
    : tone === "watch"
      ? "border-amber-300/35 bg-amber-300/10"
      : "border-emerald-400/30 bg-emerald-400/10";

  return (
    <div className={["rounded-3xl border p-4", classes].join(" ")}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-semibold">{title}</p>
        <span className="text-xs font-medium text-muted-foreground">{items.length}</span>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? <EmptyState label={emptyLabel} /> : null}
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-white/70 bg-white/80 p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <OccurrenceSeverityBadge value={item.severity} />
              <OccurrenceStatusBadge value={item.status} />
            </div>
            <p className="mt-3 text-sm font-semibold">{item.title}</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {formatDeadlineLabel(item.slaDeadlineAt, currentTime)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-secondary/30 px-4 py-4 text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function formatDeadlineLabel(value?: string | null, currentTime?: string) {
  if (!value || !currentTime) {
    return "Sem SLA definido";
  }

  const minutes = Math.round(
    (new Date(value).getTime() - new Date(currentTime).getTime()) / 60_000,
  );

  if (minutes < 0) {
    return `Atrasado ha ${formatMinutes(Math.abs(minutes))}`;
  }

  if (minutes === 0) {
    return "SLA vencendo agora";
  }

  return `Vence em ${formatMinutes(minutes)}`;
}

function formatMinutes(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}min`;
}

function getActionSuccessMessage(actionType: ControlTowerPriorityItem["actionType"]) {
  const labels: Record<ControlTowerPriorityItem["actionType"], string> = {
    SHIP_ARRIVAL: "Navio atracado a partir da torre de controle.",
    CUSTOMS_RELEASE: "Liberacao aduaneira disparada pela torre.",
    DISPATCH: "Despacho iniciado diretamente pela torre.",
    DELIVERY: "Entrega confirmada pela torre de controle.",
    ADVANCE_CYCLE: "Ciclo operacional avancado pela torre.",
  };

  return labels[actionType];
}
