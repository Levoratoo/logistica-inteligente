"use client";

import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  Ship,
  SkipForward,
  TimerReset,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import {
  DEMO_SCENARIO_LABELS,
  DEMO_SPEED_LABELS,
  type DemoScenario,
  type DemoSpeed,
} from "@/lib/demo-runtime";
import { formatDateTime } from "@/lib/formatters";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getErrorMessage } from "@/services/api-client";
import { listContainers } from "@/services/containers-service";
import { listShips } from "@/services/ships-service";
import {
  getSimulationRuntime,
  resetSimulationDemo,
  runSimulationCycle,
  simulateCustomsRelease,
  simulateDelivery,
  simulateDispatch,
  simulateShipArrival,
  updateSimulationRunning,
  updateSimulationScenario,
  updateSimulationSpeed,
} from "@/services/simulations-service";

const scenarioOptions: DemoScenario[] = ["STABLE", "TIGHT", "CRITICAL"];
const speedOptions: DemoSpeed[] = [0.5, 1, 2];

export default function SimulationPage() {
  const queryClient = useQueryClient();

  const runtimeQuery = useQuery({
    queryKey: ["simulation-runtime"],
    queryFn: getSimulationRuntime,
  });

  const shipsQuery = useQuery({
    queryKey: ["simulation-ships"],
    queryFn: () => listShips({ page: 1, pageSize: 20 }),
  });

  const containersQuery = useQuery({
    queryKey: ["simulation-containers"],
    queryFn: () => listContainers({ page: 1, pageSize: 50 }),
  });

  function syncSimulation(message?: string) {
    if (message) {
      toast.success(message);
    }

    queryClient.invalidateQueries({ queryKey: ["simulation-runtime"] });
    queryClient.invalidateQueries({ queryKey: ["simulation-runtime-topbar"] });
    queryClient.invalidateQueries({ queryKey: ["simulation-ships"] });
    queryClient.invalidateQueries({ queryKey: ["simulation-containers"] });
    queryClient.invalidateQueries({ queryKey: ["containers"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-overview-topbar"] });
    queryClient.invalidateQueries({ queryKey: ["tracking"] });
  }

  const scenarioMutation = useMutation({
    mutationFn: updateSimulationScenario,
    onSuccess: () => syncSimulation("Cenário operacional atualizado."),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const speedMutation = useMutation({
    mutationFn: updateSimulationSpeed,
    onSuccess: () => syncSimulation("Velocidade da operação ajustada."),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const runningMutation = useMutation({
    mutationFn: updateSimulationRunning,
    onSuccess: (data) =>
      syncSimulation(data.isRunning ? "Simulação retomada." : "Simulação pausada."),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const cycleMutation = useMutation({
    mutationFn: runSimulationCycle,
    onSuccess: () => syncSimulation("Ciclo operacional executado."),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const resetMutation = useMutation({
    mutationFn: resetSimulationDemo,
    onSuccess: () => syncSimulation("Demo reiniciada com seed nova."),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const shipArrivalMutation = useMutation({
    mutationFn: simulateShipArrival,
    onSuccess: () => syncSimulation("Chegada de navio simulada."),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const customsMutation = useMutation({
    mutationFn: simulateCustomsRelease,
    onSuccess: () => syncSimulation("Liberação alfandegária simulada."),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const dispatchMutation = useMutation({
    mutationFn: simulateDispatch,
    onSuccess: () => syncSimulation("Saída para transporte simulada."),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deliveryMutation = useMutation({
    mutationFn: simulateDelivery,
    onSuccess: () => syncSimulation("Entrega simulada com sucesso."),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const runtime = runtimeQuery.data;
  const ships = shipsQuery.data?.data ?? [];
  const containers = containersQuery.data?.data ?? [];

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Automação assistida"
        title="Simulation Center"
        description="O PortFlow pode operar sozinho em demo local, persistindo estado no navegador e mantendo a operação viva mesmo em hospedagem estática."
      />

      <Card className="overflow-hidden border-border/80 bg-slate-950 text-slate-50">
        <CardContent className="grid gap-6 p-6">
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="grid gap-4 md:grid-cols-4">
              <ControlStat
                label="Sincronização"
                value={runtime ? runtime.sourceLabel : "Inicializando"}
                helper="Cliente local"
                tone="success"
              />
              <ControlStat
                label="Relógio operacional"
                value={runtime ? formatDateTime(runtime.currentTime) : "--"}
              />
              <ControlStat
                label="Cenário ativo"
                value={runtime ? DEMO_SCENARIO_LABELS[runtime.scenario] : "--"}
              />
              <ControlStat
                label="Tick atual"
                value={runtime ? `#${runtime.tick}` : "--"}
              />
            </div>

            <div className="grid gap-4">
              <div className="flex flex-wrap justify-end gap-2">
                {scenarioOptions.map((scenario) => (
                  <ControlPill
                    key={scenario}
                    active={runtime?.scenario === scenario}
                    onClick={() => scenarioMutation.mutate(scenario)}
                  >
                    {DEMO_SCENARIO_LABELS[scenario]}
                  </ControlPill>
                ))}
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {speedOptions.map((speed) => (
                  <ControlPill
                    key={speed}
                    active={runtime?.speed === speed}
                    onClick={() => speedMutation.mutate(speed)}
                  >
                    {DEMO_SPEED_LABELS[speed]}
                  </ControlPill>
                ))}
              </div>
              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  variant="outline"
                  className="border-slate-700 bg-slate-900 text-slate-50 hover:bg-slate-800"
                  onClick={() => runningMutation.mutate(!(runtime?.isRunning ?? true))}
                >
                  {runtime?.isRunning ? (
                    <PauseCircle className="size-4" />
                  ) : (
                    <PlayCircle className="size-4" />
                  )}
                  {runtime?.isRunning ? "Pausar" : "Retomar"}
                </Button>
                <Button
                  variant="outline"
                  className="border-slate-700 bg-slate-900 text-slate-50 hover:bg-slate-800"
                  onClick={() => cycleMutation.mutate(1)}
                >
                  <SkipForward className="size-4" />
                  Avançar 1 ciclo
                </Button>
                <Button
                  variant="outline"
                  className="border-amber-400/60 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                  onClick={() => resetMutation.mutate()}
                >
                  <RotateCcw className="size-4" />
                  Reiniciar demo
                </Button>
              </div>
              <div className="flex justify-end text-xs text-slate-400">
                {runtime?.persistenceLabel}
              </div>
            </div>
          </div>

          {runtime ? (
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              <QueueStat label="Navios na fila" value={runtime.readyQueues.ships} />
              <QueueStat label="Liberação aduaneira" value={runtime.readyQueues.customs} />
              <QueueStat label="Despachos prontos" value={runtime.readyQueues.dispatch} />
              <QueueStat label="Entregas em rota" value={runtime.readyQueues.deliveries} />
              <QueueStat label="Alertas ativos" value={runtime.alerts.delayedContainers} />
              <QueueStat label="Entregas concluídas" value={runtime.totals.delivered} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-2">
        <SimulationCard
          title="Simular chegada de navio"
          icon={Ship}
          description="Navios previstos ou atrasados podem ser atracados, descarregando automaticamente os contêineres vinculados."
          items={ships.filter((shipItem) =>
            ["PREVISTO", "ATRASADO"].includes(shipItem.status),
          )}
          renderAction={(shipItem) => (
            <Button
              size="sm"
              onClick={() => shipArrivalMutation.mutate(shipItem.id)}
              disabled={shipArrivalMutation.isPending}
            >
              Atracar navio
            </Button>
          )}
          renderMeta={(shipItem) => (
            <>
              <span>ETA: {formatDateTime(shipItem.eta)}</span>
              <span>{shipItem.expectedContainers} previstos</span>
            </>
          )}
          renderStatus={(shipItem) => <StatusBadge value={shipItem.status} />}
          getKey={(shipItem) => shipItem.id}
          getTitle={(shipItem) => shipItem.name}
          getDescription={(shipItem) => `${shipItem.origin} → ${shipItem.destination}`}
        />

        <SimulationCard
          title="Simular liberação alfandegária"
          icon={TimerReset}
          description="Transiciona unidades em porto ou fiscalização para o status liberado."
          items={containers.filter((containerItem) =>
            ["NO_PORTO", "EM_FISCALIZACAO", "ATRASADO"].includes(containerItem.status),
          )}
          renderAction={(containerItem) => (
            <Button
              size="sm"
              onClick={() => customsMutation.mutate(containerItem.id)}
              disabled={customsMutation.isPending}
            >
              Liberar carga
            </Button>
          )}
          renderMeta={(containerItem) => (
            <>
              <span>{containerItem.clientName}</span>
              <span>{containerItem.ship?.name ?? "Sem navio"}</span>
            </>
          )}
          renderStatus={(containerItem) => <StatusBadge value={containerItem.status} />}
          getKey={(containerItem) => containerItem.id}
          getTitle={(containerItem) => containerItem.containerCode}
          getDescription={(containerItem) => containerItem.cargoDescription}
        />

        <SimulationCard
          title="Simular saída para transporte"
          icon={Truck}
          description="Contêineres liberados podem ser despachados para o trecho rodoviário."
          items={containers.filter((containerItem) => containerItem.status === "LIBERADO")}
          renderAction={(containerItem) => (
            <Button
              size="sm"
              onClick={() => dispatchMutation.mutate(containerItem.id)}
              disabled={dispatchMutation.isPending}
            >
              Iniciar transporte
            </Button>
          )}
          renderMeta={(containerItem) => (
            <>
              <span>{containerItem.clientName}</span>
              <span>{containerItem.carrier?.name ?? "Sem transportadora"}</span>
            </>
          )}
          renderStatus={(containerItem) => <StatusBadge value={containerItem.status} />}
          getKey={(containerItem) => containerItem.id}
          getTitle={(containerItem) => containerItem.containerCode}
          getDescription={(containerItem) => containerItem.destination}
        />

        <SimulationCard
          title="Simular entrega"
          icon={CheckCircle2}
          description="Finaliza a operação de transporte com confirmação da entrega."
          items={containers.filter(
            (containerItem) => containerItem.status === "EM_TRANSPORTE",
          )}
          renderAction={(containerItem) => (
            <Button
              size="sm"
              onClick={() => deliveryMutation.mutate(containerItem.id)}
              disabled={deliveryMutation.isPending}
            >
              Confirmar entrega
            </Button>
          )}
          renderMeta={(containerItem) => (
            <>
              <span>{containerItem.clientName}</span>
              <span>{containerItem.carrier?.name ?? "Sem transportadora"}</span>
            </>
          )}
          renderStatus={(containerItem) => <StatusBadge value={containerItem.status} />}
          getKey={(containerItem) => containerItem.id}
          getTitle={(containerItem) => containerItem.containerCode}
          getDescription={(containerItem) => containerItem.destination}
        />
      </section>
    </div>
  );
}

function ControlStat({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: "success";
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
        {label}
      </p>
      <div className="mt-3 flex items-center gap-2">
        {tone === "success" ? <Activity className="size-4 text-emerald-400" /> : null}
        <p className="font-display text-xl font-semibold text-slate-50">{value}</p>
      </div>
      {helper ? <p className="mt-2 text-xs text-slate-400">{helper}</p> : null}
    </div>
  );
}

function QueueStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-semibold text-slate-50">{value}</p>
    </div>
  );
}

function ControlPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-4 py-2 text-sm font-semibold transition",
        active
          ? "border-cyan-400 bg-cyan-400/15 text-slate-50"
          : "border-slate-800 bg-slate-950/70 text-slate-400 hover:border-slate-700 hover:text-slate-100",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function SimulationCard<T>({
  title,
  description,
  icon: Icon,
  items,
  renderAction,
  renderMeta,
  renderStatus,
  getKey,
  getTitle,
  getDescription,
}: {
  title: string;
  description: string;
  icon: typeof Ship;
  items: T[];
  renderAction: (item: T) => ReactNode;
  renderMeta: (item: T) => ReactNode;
  renderStatus: (item: T) => ReactNode;
  getKey: (item: T) => string;
  getTitle: (item: T) => string;
  getDescription: (item: T) => string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <Icon className="size-5" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-secondary/40 px-4 py-5 text-sm text-muted-foreground">
            Nenhum item disponível para esta simulação.
          </div>
        ) : null}
        {items.slice(0, 6).map((item) => (
          <div
            key={getKey(item)}
            className="rounded-2xl border border-border/80 bg-white/75 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{getTitle(item)}</p>
                <p className="text-sm text-muted-foreground">{getDescription(item)}</p>
              </div>
              {renderStatus(item)}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium text-muted-foreground">
              {renderMeta(item)}
            </div>
            <div className="mt-4 flex justify-end">{renderAction(item)}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
