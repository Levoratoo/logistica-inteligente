import type {
  BerthStatus,
  BerthWindow,
  Container,
  Ship,
  YardHotspot,
  YardOperationsOverview,
  YardSlot,
  YardTone,
  YardZone,
} from "@/types/api";
import { listContainers } from "./containers-service";
import { listShips } from "./ships-service";
import { getSimulationRuntime } from "./simulations-service";

type ZoneTemplate = {
  id: string;
  code: string;
  name: string;
  capacity: number;
};

const zoneTemplates: ZoneTemplate[] = [
  { id: "canal-buffer", code: "CB-01", name: "Canal e Pre-Stack", capacity: 12 },
  { id: "patio-pulmao", code: "PP-02", name: "Patio Pulmao", capacity: 18 },
  { id: "aduana-norte", code: "AN-01", name: "Aduana Norte", capacity: 14 },
  { id: "aduana-sul", code: "AS-02", name: "Aduana Sul", capacity: 14 },
  { id: "expedicao-leste", code: "EL-01", name: "Expedicao Leste", capacity: 10 },
  { id: "expedicao-oeste", code: "EO-02", name: "Expedicao Oeste", capacity: 10 },
];

const berthNames = ["Berco Leste 1", "Berco Leste 2", "Berco Oeste 1"];

function hashString(value: string) {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash;
}

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

function routeForZone(zoneId: string) {
  if (zoneId === "canal-buffer") {
    return "/ships";
  }

  if (zoneId === "expedicao-leste" || zoneId === "expedicao-oeste") {
    return "/control-tower";
  }

  return "/containers";
}

function getDispatchZone(container: Container) {
  return hashString(container.containerCode) % 2 === 0
    ? "expedicao-leste"
    : "expedicao-oeste";
}

function getCustomsZone(container: Container) {
  return hashString(container.clientName) % 2 === 0
    ? "aduana-norte"
    : "aduana-sul";
}

function resolveZoneId(container: Container) {
  if (
    container.status === "AGUARDANDO_NAVIO" ||
    (container.status === "ATRASADO" && !container.portEntryAt)
  ) {
    return "canal-buffer";
  }

  if (container.status === "NO_PORTO" && !container.inspectionStartedAt) {
    return "patio-pulmao";
  }

  if (
    container.status === "EM_FISCALIZACAO" ||
    (container.portEntryAt && !container.customsReleasedAt)
  ) {
    return getCustomsZone(container);
  }

  if (
    container.status === "LIBERADO" ||
    (container.customsReleasedAt && !container.transportStartedAt)
  ) {
    return getDispatchZone(container);
  }

  return null;
}

function countBlockedContainers(containers: Container[]) {
  return containers.filter(
    (container) =>
      container.status === "ATRASADO" ||
      (container.documentWorkflow?.blockedStages.length ?? 0) > 0,
  ).length;
}

function buildFocusLabel(zoneId: string, containers: Container[]) {
  if (zoneId === "canal-buffer") {
    return `${containers.length} unidades aguardando escala ou recuperacao de janela.`;
  }

  if (zoneId === "patio-pulmao") {
    return `${containers.length} unidades em staging para conferencia e triagem.`;
  }

  if (zoneId === "aduana-norte" || zoneId === "aduana-sul") {
    const blocked = containers.filter(
      (container) => !(container.documentWorkflow?.customsReady ?? false),
    ).length;
    return blocked > 0
      ? `${blocked} cargas com pendencia documental na fila aduaneira.`
      : `${containers.length} cargas em conferencia aduaneira.`;
  }

  const blocked = containers.filter(
    (container) => !(container.documentWorkflow?.dispatchReady ?? false),
  ).length;
  return blocked > 0
    ? `${blocked} unidades aguardando checklist final para retirada.`
    : `${containers.length} cargas prontas para expedicao rodoviaria.`;
}

function getZoneTone(utilization: number, blocked: number): YardTone {
  if (utilization >= 0.84 || blocked >= 3) {
    return "CRITICAL";
  }

  if (utilization >= 0.64 || blocked >= 1) {
    return "WATCH";
  }

  return "STABLE";
}

function buildZoneSlots(
  zone: ZoneTemplate,
  containers: Container[],
  blocked: number,
  reserved: number,
): YardSlot[] {
  const slots: YardSlot[] = [];
  const occupiedCount = Math.min(containers.length, zone.capacity);
  const blockedCount = Math.min(blocked, Math.max(zone.capacity - occupiedCount, 0));
  const reservedCount = Math.min(
    reserved,
    Math.max(zone.capacity - occupiedCount - blockedCount, 0),
  );
  const emptyCount = Math.max(zone.capacity - occupiedCount - blockedCount - reservedCount, 0);

  for (const container of containers.slice(0, occupiedCount)) {
    slots.push({
      id: `${zone.id}-${container.id}`,
      state: "OCCUPIED",
      label: container.containerCode.slice(-4),
      containerId: container.id,
      containerCode: container.containerCode,
    });
  }

  for (let index = 0; index < blockedCount; index += 1) {
    slots.push({
      id: `${zone.id}-blocked-${index}`,
      state: "BLOCKED",
      label: "H",
      containerId: null,
      containerCode: null,
    });
  }

  for (let index = 0; index < reservedCount; index += 1) {
    slots.push({
      id: `${zone.id}-reserved-${index}`,
      state: "RESERVED",
      label: "R",
      containerId: null,
      containerCode: null,
    });
  }

  for (let index = 0; index < emptyCount; index += 1) {
    slots.push({
      id: `${zone.id}-empty-${index}`,
      state: "EMPTY",
      label: "",
      containerId: null,
      containerCode: null,
    });
  }

  return slots;
}

function buildZones(currentTime: string, containers: Container[], ships: Ship[]) {
  void currentTime;

  const zoneMap = new Map<string, Container[]>();
  for (const zone of zoneTemplates) {
    zoneMap.set(zone.id, []);
  }

  for (const container of containers) {
    const zoneId = resolveZoneId(container);

    if (!zoneId) {
      continue;
    }

    zoneMap.get(zoneId)?.push(container);
  }

  const upcomingShips = ships.filter((ship) => {
    const hours = hoursUntil(currentTime, ship.eta);
    return ship.status !== "PARTIU" && hours <= 8;
  });
  const activeShips = ships.filter((ship) =>
    ["ATRACADO", "DESCARREGANDO"].includes(ship.status),
  );
  const customsReadyQueue = containers.filter(
    (container) => container.status === "NO_PORTO" && !container.inspectionStartedAt,
  ).length;

  return zoneTemplates.map((zone) => {
    const assigned = [...(zoneMap.get(zone.id) ?? [])].sort((left, right) =>
      compareByEta(left.eta, right.eta),
    );
    const blockedCandidates = countBlockedContainers(assigned);
    let reserved = 0;

    if (zone.id === "canal-buffer") {
      reserved = Math.min(upcomingShips.length * 2, 4);
    } else if (zone.id === "patio-pulmao") {
      reserved = Math.min(activeShips.length * 2, 4);
    } else if (zone.id === "aduana-norte" || zone.id === "aduana-sul") {
      reserved = Math.min(Math.ceil(customsReadyQueue / 2), 3);
    } else {
      reserved = Math.min(
        assigned.filter((container) => container.status === "LIBERADO").length,
        2,
      );
    }

    const occupied = Math.min(assigned.length, zone.capacity);
    const blocked = Math.min(blockedCandidates, Math.max(zone.capacity - occupied, 0), 3);
    const reservedSlots = Math.min(
      reserved,
      Math.max(zone.capacity - occupied - blocked, 0),
    );
    const free = Math.max(zone.capacity - occupied - blocked - reservedSlots, 0);
    const utilization = (occupied + blocked + reservedSlots) / zone.capacity;
    const tone = getZoneTone(utilization, blocked);

    return {
      id: zone.id,
      code: zone.code,
      name: zone.name,
      capacity: zone.capacity,
      occupied,
      reserved: reservedSlots,
      blocked,
      free,
      utilization,
      tone,
      focusLabel: buildFocusLabel(zone.id, assigned),
      containers: assigned.slice(0, 5).map((container) => ({
        id: container.id,
        containerCode: container.containerCode,
        status: container.status,
        clientName: container.clientName,
      })),
      slots: buildZoneSlots(zone, assigned, blocked, reservedSlots),
    } satisfies YardZone;
  });
}

function buildBerthSchedule(currentTime: string, ships: Ship[]) {
  const active = [...ships]
    .filter((ship) => ship.status !== "PARTIU")
    .sort((left, right) => {
      const leftPriority = left.status === "DESCARREGANDO"
        ? 0
        : left.status === "ATRACADO"
          ? 1
          : left.status === "ATRASADO"
            ? 2
            : 3;
      const rightPriority = right.status === "DESCARREGANDO"
        ? 0
        : right.status === "ATRACADO"
          ? 1
          : right.status === "ATRASADO"
            ? 2
            : 3;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return compareByEta(left.eta, right.eta);
    });

  return berthNames.map((name, index) => {
    const ship = active[index] ?? null;
    const nextShip = active[index + berthNames.length] ?? null;

    if (!ship) {
      return {
        id: `berth-${index + 1}`,
        name,
        status: "FREE",
        tone: "STABLE",
        note: "Berco livre para receber proxima escala.",
        startAt: null,
        endAt: null,
        ship: null,
        nextShip: null,
        load: 0,
      } satisfies BerthWindow;
    }

    let status: BerthStatus = "BOOKED";
    let tone: YardTone = "STABLE";
    let note = "Janela confirmada para a proxima escala.";

    if (ship.status === "ATRACADO" || ship.status === "DESCARREGANDO") {
      status = "OPERATING";
      tone = ship.status === "DESCARREGANDO" ? "WATCH" : "STABLE";
      note = "Operacao de descarga em curso com equipe de patio alocada.";
    } else if (ship.status === "ATRASADO") {
      status = "WATCH";
      tone = hoursUntil(currentTime, ship.eta) < -3 ? "CRITICAL" : "WATCH";
      note = "Escala atrasada e exigindo replanejamento da janela de atracacao.";
    } else if (hoursUntil(currentTime, ship.eta) <= 2) {
      status = "BOOKED";
      tone = "WATCH";
      note = "Chegada prevista para as proximas 2 horas.";
    }

    return {
      id: `berth-${index + 1}`,
      name,
      status,
      tone,
      note,
      startAt: ship.actualArrivalAt ?? ship.eta,
      endAt: ship.etd ?? null,
      ship: {
        id: ship.id,
        name: ship.name,
        status: ship.status,
        company: ship.company,
        origin: ship.origin,
        destination: ship.destination,
        eta: ship.eta,
        etd: ship.etd ?? null,
      },
      nextShip: nextShip
        ? {
            id: nextShip.id,
            name: nextShip.name,
            status: nextShip.status,
            company: nextShip.company,
            origin: nextShip.origin,
            destination: nextShip.destination,
            eta: nextShip.eta,
            etd: nextShip.etd ?? null,
          }
        : null,
      load: ship.expectedContainers,
    } satisfies BerthWindow;
  });
}

function buildHotspots(zones: YardZone[], berths: BerthWindow[]): YardHotspot[] {
  const zoneHotspots = zones
    .filter((zone) => zone.tone !== "STABLE")
    .sort((left, right) => right.utilization - left.utilization)
    .map((zone) => ({
      id: `zone-${zone.id}`,
      title: `${zone.name} em ${zone.tone === "CRITICAL" ? "pressao critica" : "atencao"}`,
      description: `${zone.occupied} slots ocupados, ${zone.blocked} bloqueados e foco em ${zone.focusLabel.toLowerCase()}`,
      tone: zone.tone,
      routeHref: routeForZone(zone.id),
    }));

  const berthHotspots = berths
    .filter((berth) => berth.tone !== "STABLE")
    .map((berth) => ({
      id: `berth-${berth.id}`,
      title: `${berth.name} requer ajuste fino`,
      description: berth.note,
      tone: berth.tone,
      routeHref: "/ships",
    }));

  const hotspots = [...zoneHotspots, ...berthHotspots].slice(0, 4);

  if (hotspots.length > 0) {
    return hotspots;
  }

  return [
    {
      id: "yard-stable",
      title: "Patio estabilizado",
      description: "Sem saturacao critica. Acompanhe o fluxo autonomo e mantenha a janela de docas em observacao.",
      tone: "STABLE",
      routeHref: "/dashboard",
    },
  ];
}

export async function getYardOperationsOverview(): Promise<YardOperationsOverview> {
  const [runtime, containerResponse, shipResponse] = await Promise.all([
    getSimulationRuntime(),
    listContainers({ page: 1, pageSize: 100 }),
    listShips({ page: 1, pageSize: 50 }),
  ]);

  const containers = containerResponse.data;
  const ships = shipResponse.data;
  const zones = buildZones(runtime.currentTime, containers, ships);
  const berthSchedule = buildBerthSchedule(runtime.currentTime, ships);
  const occupiedSlots = zones.reduce((total, zone) => total + zone.occupied, 0);
  const freeSlots = zones.reduce((total, zone) => total + zone.free, 0);
  const reservedSlots = zones.reduce((total, zone) => total + zone.reserved, 0);
  const blockedSlots = zones.reduce((total, zone) => total + zone.blocked, 0);
  const totalCapacity = zones.reduce((total, zone) => total + zone.capacity, 0);
  const nextArrivals = ships.filter((ship) => {
    const hours = hoursUntil(runtime.currentTime, ship.eta);
    return ship.status !== "PARTIU" && hours <= 12;
  }).length;
  const activeBerths = berthSchedule.filter((berth) => berth.status === "OPERATING").length;

  return {
    currentTime: runtime.currentTime,
    occupancyRate: clamp(
      (occupiedSlots + reservedSlots + blockedSlots) / totalCapacity,
      0,
      1,
    ),
    occupiedSlots,
    freeSlots,
    reservedSlots,
    blockedSlots,
    activeBerths,
    nextArrivals,
    zones,
    berthSchedule,
    hotspots: buildHotspots(zones, berthSchedule),
  };
}
