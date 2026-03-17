"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Anchor,
  ArrowRight,
  Map,
  PlayCircle,
  ShipWheel,
  SquareStack,
  Warehouse,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/formatters";
import { getErrorMessage } from "@/services/api-client";
import { getYardOperationsOverview } from "@/services/yard-operations-service";
import {
  runSimulationCycle,
  simulateShipArrival,
} from "@/services/simulations-service";
import type {
  BerthStatus,
  BerthWindow,
  YardSlotState,
  YardTone,
  YardZone,
} from "@/types/api";

const toneCardClasses: Record<YardTone, string> = {
  STABLE: "border-emerald-300/30 bg-emerald-400/10",
  WATCH: "border-amber-300/35 bg-amber-300/10",
  CRITICAL: "border-rose-300/35 bg-rose-400/12",
};

const slotClasses: Record<YardSlotState, string> = {
  OCCUPIED: "border-[#0b4f6c]/20 bg-[#0b4f6c] text-white",
  RESERVED: "border-amber-300/30 bg-amber-200 text-amber-950",
  BLOCKED: "border-rose-300/35 bg-rose-200 text-rose-950",
  EMPTY: "border-slate-200 bg-slate-100 text-transparent",
};

const berthLabels: Record<BerthStatus, string> = {
  OPERATING: "Operando",
  BOOKED: "Agendado",
  WATCH: "Sob vigilancia",
  FREE: "Livre",
};

export default function YardOperationsPage() {
  const queryClient = useQueryClient();

  const yardQuery = useQuery({
    queryKey: ["yard-operations-overview"],
    queryFn: getYardOperationsOverview,
  });

  function syncYard(message?: string) {
    if (message) {
      toast.success(message);
    }

    queryClient.invalidateQueries({ queryKey: ["yard-operations-overview"] });
    queryClient.invalidateQueries({ queryKey: ["control-tower-overview"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-overview-occurrences"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-overview-topbar"] });
    queryClient.invalidateQueries({ queryKey: ["simulation-runtime"] });
    queryClient.invalidateQueries({ queryKey: ["simulation-runtime-topbar"] });
    queryClient.invalidateQueries({ queryKey: ["simulation-ships"] });
    queryClient.invalidateQueries({ queryKey: ["simulation-containers"] });
    queryClient.invalidateQueries({ queryKey: ["ships"] });
    queryClient.invalidateQueries({ queryKey: ["containers"] });
    queryClient.invalidateQueries({ queryKey: ["tracking"] });
    queryClient.invalidateQueries({ queryKey: ["occurrences"] });
    queryClient.invalidateQueries({ queryKey: ["occurrences-summary"] });
  }

  const cycleMutation = useMutation({
    mutationFn: () => runSimulationCycle(1),
    onSuccess: () => syncYard("Ciclo operacional avancado a partir do mapa de patio."),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const shipArrivalMutation = useMutation({
    mutationFn: simulateShipArrival,
    onSuccess: () => syncYard("Navio atracado diretamente pela programacao de docas."),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const data = yardQuery.data;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Mapa terminal"
        title="Patio e Docas"
        description="Visao espacial da ocupacao do terminal, hotspots de capacidade e janelas de atracacao derivadas do motor autonomo do PortFlow."
        actions={(
          <>
            <Button
              variant="outline"
              onClick={() => cycleMutation.mutate()}
              disabled={cycleMutation.isPending}
            >
              <PlayCircle className="size-4" />
              Avancar 1 ciclo
            </Button>
            <Button asChild>
              <Link href="/control-tower">
                <Warehouse className="size-4" />
                Abrir Torre
              </Link>
            </Button>
          </>
        )}
      />

      {yardQuery.isLoading || !data ? (
        <Card>
          <CardContent className="p-10 text-sm text-muted-foreground">
            Montando mapa operacional do patio e das docas...
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Ocupacao do patio"
              value={formatPercent(data.occupancyRate)}
              helper={`${data.occupiedSlots} slots ocupados e ${data.reservedSlots} reservados`}
              icon={Map}
            />
            <StatCard
              title="Slots bloqueados"
              value={String(data.blockedSlots)}
              helper="Capacidade segregada por avaria, atraso ou checklist incompleto"
              icon={SquareStack}
            />
            <StatCard
              title="Bercos ativos"
              value={String(data.activeBerths)}
              helper="Frentes de atracacao com escala em operacao"
              icon={Anchor}
            />
            <StatCard
              title="Chegadas em 12h"
              value={String(data.nextArrivals)}
              helper={`${data.freeSlots} slots livres projetados no terminal`}
              icon={ShipWheel}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="overflow-hidden border-none bg-[linear-gradient(135deg,#081726_0%,#0d2940_48%,#15415e_100%)] text-white">
              <CardHeader className="pb-2">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <CardTitle className="text-white">Mapa do patio ao vivo</CardTitle>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                      Zonas de armazenagem, staging e expedicao recalculadas a cada ciclo do motor autonomo.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white/72">
                    Atualizado em {formatDateTime(data.currentTime)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
                {data.zones.map((zone) => (
                  <ZoneCard key={zone.id} zone={zone} />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Programacao de docas</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Berços com escala em operacao, previsao de ocupacao e janelas seguintes.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.berthSchedule.map((berth) => (
                  <BerthCard
                    key={berth.id}
                    berth={berth}
                    onArrive={(shipId) => shipArrivalMutation.mutate(shipId)}
                    pending={shipArrivalMutation.isPending}
                  />
                ))}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Hotspots do terminal</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Os pontos abaixo combinam saturacao fisica e risco operacional.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.hotspots.map((hotspot) => (
                  <div
                    key={hotspot.id}
                    className={[
                      "rounded-3xl border p-5",
                      toneCardClasses[hotspot.tone],
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-xl font-semibold">{hotspot.title}</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {hotspot.description}
                        </p>
                      </div>
                      <span className="rounded-full bg-black/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/80">
                        {formatToneLabel(hotspot.tone)}
                      </span>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button asChild variant="outline">
                        <Link href={hotspot.routeHref}>
                          Abrir contexto
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alocacao por zona</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Amostra das unidades atualmente posicionadas em cada area do terminal.
                </p>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {data.zones.map((zone) => (
                  <div
                    key={`${zone.id}-list`}
                    className="rounded-3xl border border-border/80 bg-secondary/30 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{zone.name}</p>
                        <p className="text-xs font-medium text-muted-foreground">
                          {zone.code} • {formatPercent(zone.utilization)}
                        </p>
                      </div>
                      <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-muted-foreground">
                        {zone.occupied}/{zone.capacity}
                      </span>
                    </div>
                    <div className="mt-4 space-y-3">
                      {zone.containers.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border bg-white/70 px-3 py-4 text-sm text-muted-foreground">
                          Nenhuma unidade destacada nesta zona agora.
                        </div>
                      ) : (
                        zone.containers.map((container) => (
                          <Link
                            key={container.id}
                            href={`/container-details?id=${container.id}`}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/80 px-3 py-3 transition hover:border-primary/20 hover:bg-white"
                          >
                            <div>
                              <p className="font-medium">{container.containerCode}</p>
                              <p className="text-xs text-muted-foreground">
                                {container.clientName}
                              </p>
                            </div>
                            <StatusBadge value={container.status} />
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function ZoneCard({ zone }: { zone: YardZone }) {
  return (
    <div
      className={[
        "rounded-[28px] border p-4 text-white",
        toneCardClasses[zone.tone],
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/65">
            {zone.code}
          </p>
          <p className="mt-2 font-display text-xl font-semibold">{zone.name}</p>
        </div>
        <div className="rounded-2xl bg-black/15 px-3 py-2 text-right">
          <p className="font-display text-xl font-semibold">{zone.occupied}</p>
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/60">ocupados</p>
        </div>
      </div>

      <div className="mt-4 h-2 rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-white"
          style={{ width: `${Math.max(8, Math.round(zone.utilization * 100))}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-white/72">
        <span>{zone.blocked} bloqueados</span>
        <span>{zone.reserved} reservados</span>
        <span>{zone.free} livres</span>
      </div>

      <p className="mt-4 text-sm leading-6 text-white/75">{zone.focusLabel}</p>

      <div className="mt-4 grid grid-cols-6 gap-1.5">
        {zone.slots.map((slot) => (
          <SlotChip key={slot.id} slot={slot} />
        ))}
      </div>
    </div>
  );
}

function SlotChip({
  slot,
}: {
  slot: YardZone["slots"][number];
}) {
  const content = (
    <div
      title={slot.containerCode ?? undefined}
      className={[
        "grid h-9 place-items-center rounded-xl border text-[11px] font-semibold",
        slotClasses[slot.state],
      ].join(" ")}
    >
      {slot.label}
    </div>
  );

  if (slot.containerId) {
    return <Link href={`/container-details?id=${slot.containerId}`}>{content}</Link>;
  }

  return content;
}

function BerthCard({
  berth,
  onArrive,
  pending,
}: {
  berth: BerthWindow;
  onArrive: (shipId: string) => void;
  pending: boolean;
}) {
  return (
    <div
      className={[
        "rounded-3xl border p-5",
        toneCardClasses[berth.tone],
      ].join(" ")}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-black/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/75">
              {berth.name}
            </span>
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-muted-foreground">
              {berthLabels[berth.status]}
            </span>
          </div>

          {berth.ship ? (
            <div>
              <p className="font-display text-xl font-semibold">{berth.ship.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {berth.ship.company} • {berth.ship.origin} - {berth.ship.destination}
              </p>
            </div>
          ) : (
            <div>
              <p className="font-display text-xl font-semibold">Sem escala alocada</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Janela pronta para receber a proxima atracacao.
              </p>
            </div>
          )}

          <p className="text-sm leading-6 text-muted-foreground">{berth.note}</p>

          <div className="flex flex-wrap gap-4 text-xs font-medium text-muted-foreground">
            <span>Inicio {formatDateTime(berth.startAt)}</span>
            <span>Fim {formatDateTime(berth.endAt)}</span>
            <span>{berth.load} conteineres previstos</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:w-[210px]">
          {berth.ship && ["PREVISTO", "ATRASADO"].includes(berth.ship.status) ? (
            <Button
              onClick={() => onArrive(berth.ship!.id)}
              disabled={pending}
            >
              Atracar agora
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/ships">
              Abrir navios
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      {berth.nextShip ? (
        <div className="mt-4 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm">
          <p className="font-medium">Proxima janela: {berth.nextShip.name}</p>
          <p className="mt-1 text-muted-foreground">
            ETA {formatDateTime(berth.nextShip.eta)} • {berth.nextShip.origin} - {berth.nextShip.destination}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatToneLabel(value: YardTone) {
  const labels: Record<YardTone, string> = {
    STABLE: "Estavel",
    WATCH: "Atencao",
    CRITICAL: "Critico",
  };

  return labels[value];
}
