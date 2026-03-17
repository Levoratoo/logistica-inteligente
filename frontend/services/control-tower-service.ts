import { DEMO_SCENARIO_LABELS } from "@/lib/demo-runtime";
import type {
  Container,
  ContainerStatus,
  ControlTowerLanePressure,
  ControlTowerOverview,
  ControlTowerPriorityItem,
  ControlTowerTone,
  OccurrenceSeverity,
  OperationalOccurrence,
  Ship,
} from "@/types/api";
import { listContainers } from "./containers-service";
import { getDashboardOverview } from "./dashboard-service";
import { listOccurrences } from "./occurrences-service";
import { listShips } from "./ships-service";
import { getSimulationRuntime } from "./simulations-service";

const severityOrder: Record<OccurrenceSeverity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const customsStatuses: ContainerStatus[] = ["NO_PORTO", "EM_FISCALIZACAO", "ATRASADO"];
const dispatchStatuses: ContainerStatus[] = ["LIBERADO", "ATRASADO"];
const deliveryStatuses: ContainerStatus[] = ["EM_TRANSPORTE", "ATRASADO"];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function hoursUntil(reference: string, target?: string | null) {
  if (!target) {
    return Number.POSITIVE_INFINITY;
  }

  return (new Date(target).getTime() - new Date(reference).getTime()) / 3_600_000;
}

function compareByEta(left?: string | null, right?: string | null) {
  if (!left && !right) {
    return 0;
  }

  if (!left) {
    return 1;
  }

  if (!right) {
    return -1;
  }

  return new Date(left).getTime() - new Date(right).getTime();
}

function severityForQueue(total: number, watch: number, critical: number): ControlTowerTone {
  if (total >= critical) {
    return "CRITICAL";
  }

  if (total >= watch) {
    return "WATCH";
  }

  return "STABLE";
}

function buildLanePressure(
  title: string,
  total: number,
  helper: string,
  watch: number,
  critical: number,
): ControlTowerLanePressure {
  return {
    id: title.toLowerCase().replace(/\s+/g, "-"),
    title,
    total,
    helper,
    tone: severityForQueue(total, watch, critical),
  };
}

function findFirstContainer(containers: Container[], statuses: ContainerStatus[]) {
  return containers.find((container) => statuses.includes(container.status));
}

function resolveActionFromOccurrence(
  occurrence: OperationalOccurrence,
  ships: Ship[],
  containers: Container[],
): Pick<ControlTowerPriorityItem, "actionType" | "actionLabel" | "targetId" | "routeHref"> {
  const ship = occurrence.ship
    ? ships.find((item) => item.id === occurrence.ship?.id)
    : undefined;
  const container = occurrence.container
    ? containers.find((item) => item.id === occurrence.container?.id)
    : undefined;

  if (occurrence.category === "SHIP_DELAY") {
    if (ship && ["PREVISTO", "ATRASADO"].includes(ship.status)) {
      return {
        actionType: "SHIP_ARRIVAL",
        actionLabel: "Atracar navio",
        targetId: ship.id,
        routeHref: "/ships",
      };
    }
  }

  if (occurrence.category === "CUSTOMS_HOLD" || occurrence.category === "DOCUMENT_REVIEW") {
    if (container && customsStatuses.includes(container.status)) {
      return {
        actionType: "CUSTOMS_RELEASE",
        actionLabel: "Liberar carga",
        targetId: container.id,
        routeHref: `/container-details?id=${container.id}`,
      };
    }
  }

  if (occurrence.category === "YARD_CONGESTION") {
    if (container && dispatchStatuses.includes(container.status)) {
      return {
        actionType: "DISPATCH",
        actionLabel: "Despachar carga",
        targetId: container.id,
        routeHref: `/container-details?id=${container.id}`,
      };
    }
  }

  if (occurrence.category === "TRANSPORT_DELAY") {
    if (container && deliveryStatuses.includes(container.status)) {
      return {
        actionType: "DELIVERY",
        actionLabel: "Confirmar entrega",
        targetId: container.id,
        routeHref: `/container-details?id=${container.id}`,
      };
    }

    if (container && container.status === "LIBERADO") {
      return {
        actionType: "DISPATCH",
        actionLabel: "Iniciar transporte",
        targetId: container.id,
        routeHref: `/container-details?id=${container.id}`,
      };
    }
  }

  return {
    actionType: "ADVANCE_CYCLE",
    actionLabel: "Avancar 1 ciclo",
    targetId: null,
    routeHref: "/simulation",
  };
}

function buildOccurrencePriorityItem(
  occurrence: OperationalOccurrence,
  ships: Ship[],
  containers: Container[],
): ControlTowerPriorityItem {
  const action = resolveActionFromOccurrence(occurrence, ships, containers);

  return {
    id: occurrence.id,
    title: occurrence.title,
    description: occurrence.description,
    severity: occurrence.severity,
    occurrenceId: occurrence.id,
    occurrenceStatus: occurrence.status,
    dueAt: occurrence.slaDeadlineAt,
    ownerName: occurrence.ownerName,
    sourceLabel: occurrence.sourceLabel,
    actionType: action.actionType,
    actionLabel: action.actionLabel,
    targetId: action.targetId,
    routeHref: action.routeHref,
    category: occurrence.category,
  };
}

function buildSystemQueueItems(ships: Ship[], containers: Container[]): ControlTowerPriorityItem[] {
  const items: ControlTowerPriorityItem[] = [];

  const shipCandidate = ships.find((ship) => ["ATRASADO", "PREVISTO"].includes(ship.status));
  if (shipCandidate) {
    items.push({
      id: `queue-ship-${shipCandidate.id}`,
      title: `Atracacao pronta para ${shipCandidate.name}`,
      description: `Escala ${shipCandidate.origin} -> ${shipCandidate.destination} pronta para entrada na janela operacional.`,
      severity: shipCandidate.status === "ATRASADO" ? "HIGH" : "MEDIUM",
      occurrenceId: null,
      occurrenceStatus: null,
      dueAt: shipCandidate.eta,
      ownerName: null,
      sourceLabel: shipCandidate.name,
      actionType: "SHIP_ARRIVAL",
      actionLabel: "Atracar navio",
      targetId: shipCandidate.id,
      routeHref: "/ships",
      category: null,
    });
  }

  const customsCandidate = findFirstContainer(containers, customsStatuses);
  if (customsCandidate) {
    items.push({
      id: `queue-customs-${customsCandidate.id}`,
      title: `Janela de liberacao para ${customsCandidate.containerCode}`,
      description: "Unidade pronta para tratativa aduaneira e liberacao do fluxo.",
      severity: customsCandidate.status === "ATRASADO" ? "HIGH" : "MEDIUM",
      occurrenceId: null,
      occurrenceStatus: null,
      dueAt: customsCandidate.eta,
      ownerName: null,
      sourceLabel: customsCandidate.containerCode,
      actionType: "CUSTOMS_RELEASE",
      actionLabel: "Liberar carga",
      targetId: customsCandidate.id,
      routeHref: `/container-details?id=${customsCandidate.id}`,
      category: null,
    });
  }

  const dispatchCandidate = findFirstContainer(containers, dispatchStatuses);
  if (dispatchCandidate) {
    items.push({
      id: `queue-dispatch-${dispatchCandidate.id}`,
      title: `Fila de expedicao para ${dispatchCandidate.containerCode}`,
      description: "Carga pronta para sair do patio e iniciar o trecho rodoviario.",
      severity: dispatchCandidate.status === "ATRASADO" ? "HIGH" : "MEDIUM",
      occurrenceId: null,
      occurrenceStatus: null,
      dueAt: dispatchCandidate.eta,
      ownerName: null,
      sourceLabel: dispatchCandidate.containerCode,
      actionType: "DISPATCH",
      actionLabel: "Iniciar transporte",
      targetId: dispatchCandidate.id,
      routeHref: `/container-details?id=${dispatchCandidate.id}`,
      category: null,
    });
  }

  const deliveryCandidate = findFirstContainer(containers, deliveryStatuses);
  if (deliveryCandidate) {
    items.push({
      id: `queue-delivery-${deliveryCandidate.id}`,
      title: `Entrega elegivel para ${deliveryCandidate.containerCode}`,
      description: "Trecho final em rota com possibilidade de encerramento imediato.",
      severity: deliveryCandidate.status === "ATRASADO" ? "HIGH" : "MEDIUM",
      occurrenceId: null,
      occurrenceStatus: null,
      dueAt: deliveryCandidate.eta,
      ownerName: null,
      sourceLabel: deliveryCandidate.containerCode,
      actionType: "DELIVERY",
      actionLabel: "Confirmar entrega",
      targetId: deliveryCandidate.id,
      routeHref: `/container-details?id=${deliveryCandidate.id}`,
      category: null,
    });
  }

  return items;
}

function buildPriorityQueue(
  occurrences: OperationalOccurrence[],
  ships: Ship[],
  containers: Container[],
): ControlTowerPriorityItem[] {
  const seenTargets = new Set<string>();
  const items = [
    ...occurrences.map((occurrence) => buildOccurrencePriorityItem(occurrence, ships, containers)),
    ...buildSystemQueueItems(ships, containers),
  ]
    .filter((item) => {
      const dedupeKey = `${item.actionType}:${item.targetId ?? item.id}`;
      if (seenTargets.has(dedupeKey)) {
        return false;
      }

      seenTargets.add(dedupeKey);
      return true;
    })
    .sort((left, right) => {
      const severityDelta = severityOrder[left.severity] - severityOrder[right.severity];
      if (severityDelta !== 0) {
        return severityDelta;
      }

      return compareByEta(left.dueAt, right.dueAt);
    })
    .slice(0, 8);

  if (items.length > 0) {
    return items;
  }

  return [
    {
      id: "queue-monitor",
      title: "Fluxo estavel em observacao",
      description: "Sem gargalos urgentes. Avance um ciclo para manter a operacao viva.",
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
    },
  ];
}

function buildPrimaryFocus(overdue: number, dueSoon: number, readyQueues: number) {
  if (overdue > 0) {
    return "Priorize SLAs estourados e remova bloqueios criticos antes de abrir novas frentes.";
  }

  if (dueSoon > 0) {
    return "Concentre o turno nas tratativas que vencem nas proximas 2 horas.";
  }

  if (readyQueues > 0) {
    return "A operacao esta controlada. Execute a fila pronta para manter o throughput elevado.";
  }

  return "Operacao sob controle. Monitore a automacao e avance o fluxo conforme a demanda.";
}

export async function getControlTowerOverview(): Promise<ControlTowerOverview> {
  const [dashboard, runtime, occurrenceResponse, shipResponse, containerResponse] =
    await Promise.all([
      getDashboardOverview(),
      getSimulationRuntime(),
      listOccurrences({ page: 1, pageSize: 200 }),
      listShips({ page: 1, pageSize: 50 }),
      listContainers({ page: 1, pageSize: 100 }),
    ]);

  const occurrences = occurrenceResponse.data;
  const ships = shipResponse.data;
  const containers = containerResponse.data;
  const activeOccurrences = occurrences.filter((occurrence) => occurrence.status !== "RESOLVED");
  const overdue = activeOccurrences
    .filter((occurrence) => hoursUntil(runtime.currentTime, occurrence.slaDeadlineAt) <= 0)
    .sort((left, right) => compareByEta(left.slaDeadlineAt, right.slaDeadlineAt))
    .slice(0, 5);
  const dueSoon = activeOccurrences
    .filter((occurrence) => {
      const hours = hoursUntil(runtime.currentTime, occurrence.slaDeadlineAt);
      return hours > 0 && hours <= 2;
    })
    .sort((left, right) => compareByEta(left.slaDeadlineAt, right.slaDeadlineAt))
    .slice(0, 5);
  const onTrack = activeOccurrences
    .filter((occurrence) => {
      const hours = hoursUntil(runtime.currentTime, occurrence.slaDeadlineAt);
      return Number.isFinite(hours) ? hours > 2 : true;
    })
    .sort((left, right) => severityOrder[left.severity] - severityOrder[right.severity])
    .slice(0, 5);

  const resolvedLast24h = occurrences.filter((occurrence) => {
    if (!occurrence.resolvedAt) {
      return false;
    }

    return hoursUntil(occurrence.resolvedAt, runtime.currentTime) <= 24;
  }).length;

  const shipsApproaching = [...ships]
    .filter((ship) => {
      const hours = hoursUntil(runtime.currentTime, ship.eta);
      return ship.status !== "PARTIU" && hours <= 12;
    })
    .sort((left, right) => compareByEta(left.eta, right.eta))
    .slice(0, 4);

  const containersNeedingAttention = [...containers]
    .filter((container) =>
      ["ATRASADO", "EM_FISCALIZACAO", "LIBERADO", "EM_TRANSPORTE"].includes(container.status),
    )
    .sort((left, right) => {
      const severityDelta =
        Number(left.status !== "ATRASADO") - Number(right.status !== "ATRASADO");
      if (severityDelta !== 0) {
        return severityDelta;
      }

      return compareByEta(left.eta, right.eta);
    })
    .slice(0, 5);

  const priorityQueue = buildPriorityQueue(activeOccurrences, ships, containers);
  const lanePressure = [
    buildLanePressure(
      "Atracacao",
      runtime.readyQueues.ships + runtime.alerts.delayedShips,
      `${runtime.alerts.delayedShips} navios atrasados impactando o patio`,
      2,
      4,
    ),
    buildLanePressure(
      "Fiscalizacao",
      runtime.readyQueues.customs + dashboard.kpis.awaitingClearance,
      `${dashboard.kpis.awaitingClearance} unidades aguardando liberacao`,
      6,
      10,
    ),
    buildLanePressure(
      "Expedicao",
      runtime.readyQueues.dispatch + dashboard.kpis.containersInPort,
      `${runtime.readyQueues.dispatch} cargas prontas para retirada`,
      6,
      12,
    ),
    buildLanePressure(
      "Entrega",
      runtime.readyQueues.deliveries + dashboard.kpis.containersInTransport,
      `${dashboard.kpis.containersInTransport} unidades no trecho rodoviario`,
      4,
      8,
    ),
  ];

  const readinessPenalty =
    overdue.length * 12 +
    dueSoon.length * 5 +
    dashboard.kpis.criticalOccurrences * 6 +
    runtime.alerts.delayedShips * 7 +
    runtime.alerts.delayedContainers * 4 +
    Math.max(runtime.readyQueues.customs - 4, 0) * 2;
  const readinessScore = clamp(100 - readinessPenalty, 36, 97);
  const pressureLabel = readinessScore >= 82
    ? "Operacao sob controle"
    : readinessScore >= 64
      ? "Atencao elevada"
      : "Pressao critica";

  return {
    currentTime: runtime.currentTime,
    scenarioLabel: DEMO_SCENARIO_LABELS[runtime.scenario],
    isRunning: runtime.isRunning,
    readinessScore,
    pressureLabel,
    primaryFocus: buildPrimaryFocus(
      overdue.length,
      dueSoon.length,
      runtime.readyQueues.ships +
        runtime.readyQueues.customs +
        runtime.readyQueues.dispatch +
        runtime.readyQueues.deliveries,
    ),
    kpis: {
      actionQueue: priorityQueue.length,
      overdueSlas: overdue.length,
      dueSoonSlas: dueSoon.length,
      resolvedLast24h,
    },
    lanePressure,
    priorityQueue,
    slaWatch: {
      overdue,
      dueSoon,
      onTrack,
    },
    shipsApproaching,
    containersNeedingAttention,
  };
}
