import type {
  Carrier,
  CarrierPayload,
  Container,
  ContainerPayload,
  ContainerStatus,
  DashboardOverview,
  EventLog,
  EventType,
  OperationalOccurrence,
  OccurrenceCategory,
  OccurrenceSeverity,
  OccurrenceSourceType,
  OccurrenceStatus,
  PaginatedResponse,
  Ship,
  ShipPayload,
} from "@/types/api";

export type DemoScenario = "STABLE" | "TIGHT" | "CRITICAL";
export type DemoSpeed = 0.5 | 1 | 2;
export type RuntimeSource = "LOCAL_BROWSER";

type DelayStage = "SHIP_ARRIVAL" | "CUSTOMS" | "DISPATCH" | "DELIVERY";

type CarrierRecord = Omit<Carrier, "containers" | "_count">;

type ShipRecord = Omit<Ship, "containers" | "_count"> & {
  automation: {
    createdTick: number;
    lastStatusTick: number;
  };
};

type ContainerRecord = Omit<Container, "ship" | "carrier" | "events"> & {
  automation: {
    createdTick: number;
    lastStatusTick: number;
    holdUntilTick: number;
    delayStage?: DelayStage | null;
  };
};

type EventRecord = Omit<EventLog, "container">;
type OccurrenceRecord = Omit<OperationalOccurrence, "container" | "ship">;

type DemoState = {
  version: number;
  tick: number;
  currentTime: string;
  scenario: DemoScenario;
  speed: DemoSpeed;
  isRunning: boolean;
  randomSeed: number;
  lastEngineAt: string;
  ships: ShipRecord[];
  carriers: CarrierRecord[];
  containers: ContainerRecord[];
  events: EventRecord[];
  occurrences: OccurrenceRecord[];
};

export type SimulationRuntimeState = {
  source: RuntimeSource;
  sourceLabel: string;
  persistenceLabel: string;
  currentTime: string;
  tick: number;
  scenario: DemoScenario;
  speed: DemoSpeed;
  isRunning: boolean;
  cycleIntervalMs: number;
  readyQueues: {
    ships: number;
    customs: number;
    dispatch: number;
    deliveries: number;
  };
  alerts: {
    delayedContainers: number;
    delayedShips: number;
  };
  totals: {
    containers: number;
    inTransit: number;
    delivered: number;
  };
};

export const DEMO_UPDATE_EVENT = "portflow:demo-state-updated";
export const DEMO_SCENARIO_LABELS: Record<DemoScenario, string> = {
  STABLE: "Estável",
  TIGHT: "Costura",
  CRITICAL: "Crítica",
};

export const DEMO_SPEED_LABELS: Record<DemoSpeed, string> = {
  0.5: "0.5x Lento",
  1: "1x Normal",
  2: "2x Rápido",
};

const STORAGE_KEY = "portflow-demo-state-v3";
const STATE_VERSION = 3;
const MINUTE_MS = 60_000;
const CYCLE_MINUTES = 30;
const MAX_EVENTS = 360;
const MAX_CONTAINERS = 42;
const MAX_OCCURRENCES = 140;
const MIN_FUTURE_SHIPS = 3;

const scenarioProfiles = {
  STABLE: {
    inspectionChance: 0.28,
    customsDelayChance: 0.08,
    dispatchChance: 0.78,
    deliveryChance: 0.76,
    arrivalRecoveryChance: 0.62,
    spawnInterval: 6,
  },
  TIGHT: {
    inspectionChance: 0.38,
    customsDelayChance: 0.16,
    dispatchChance: 0.62,
    deliveryChance: 0.58,
    arrivalRecoveryChance: 0.52,
    spawnInterval: 5,
  },
  CRITICAL: {
    inspectionChance: 0.52,
    customsDelayChance: 0.28,
    dispatchChance: 0.45,
    deliveryChance: 0.42,
    arrivalRecoveryChance: 0.4,
    spawnInterval: 4,
  },
} as const;

const cycleIntervals: Record<DemoSpeed, number> = {
  0.5: 8_000,
  1: 4_000,
  2: 2_000,
};

const shipCompanies = [
  "Maersk Line",
  "MSC Mediterranean Shipping",
  "CMA CGM",
  "Hapag-Lloyd",
  "COSCO Shipping",
  "ONE Line",
];

const shipNameStarts = [
  "Atlantic",
  "Blue",
  "Costa",
  "Mercury",
  "Pacific",
  "Santos",
  "Southern",
  "Vega",
];

const shipNameEnds = [
  "Bridge",
  "Crown",
  "Delta",
  "Frontier",
  "Horizon",
  "Navigator",
  "Orion",
  "Valiant",
];

const origins = [
  "Singapore",
  "Busan",
  "Rotterdam",
  "Antwerp",
  "Shanghai",
  "Kingston",
  "Hamburg",
];

const clientPool = [
  "Ambev",
  "Braskem",
  "Gerdau",
  "JBS",
  "Klabin",
  "Suzano",
  "Usiminas",
  "WEG",
];

const cargoPool = [
  { description: "Resina PET grau alimentício", minWeight: 18_000, maxWeight: 25_500 },
  { description: "Componentes eletromecânicos industriais", minWeight: 8_500, maxWeight: 16_200 },
  { description: "Chapas de aço galvanizado", minWeight: 21_000, maxWeight: 28_000 },
  { description: "Insumos químicos para manufatura", minWeight: 15_400, maxWeight: 24_800 },
  { description: "Papel cartão para conversão", minWeight: 13_200, maxWeight: 22_400 },
  { description: "Equipamentos de automação portuária", minWeight: 7_200, maxWeight: 14_700 },
];

const roadDestinations = [
  "Campinas/SP",
  "Contagem/MG",
  "Curitiba/PR",
  "Jundiaí/SP",
  "Joinville/SC",
  "Piracicaba/SP",
  "Sorocaba/SP",
];

const eventTitles: Record<EventType, string> = {
  NAVIO_PREVISTO: "Escala prevista",
  NAVIO_CHEGOU: "Navio atracado",
  CONTAINER_DESCARREGADO: "Contêiner descarregado",
  EM_FISCALIZACAO: "Carga em fiscalização",
  LIBERADO: "Liberação concluída",
  SAIU_PARA_TRANSPORTE: "Saída para transporte",
  ENTREGUE: "Entrega confirmada",
  STATUS_ATUALIZADO: "Atualização operacional",
};

declare global {
  interface Window {
    __portflowDemoEngine__?: {
      timerId: number | null;
      subscribers: number;
    };
  }
}

function isBrowser() {
  return typeof window !== "undefined";
}

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function roundToHalfHour(date: Date) {
  const next = new Date(date);
  next.setSeconds(0, 0);
  next.setMinutes(next.getMinutes() < 30 ? 0 : 30);
  return next;
}

function addMinutes(value: string | Date, minutes: number) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Date(date.getTime() + minutes * MINUTE_MS).toISOString();
}

function addHours(value: string | Date, hours: number) {
  return addMinutes(value, hours * 60);
}

function diffHours(start?: string | null, end?: string | null) {
  if (!start || !end) {
    return 0;
  }

  return Math.max(
    0,
    Math.round((new Date(end).getTime() - new Date(start).getTime()) / (60 * MINUTE_MS)),
  );
}

function compareAsc(left?: string | null, right?: string | null) {
  return new Date(left ?? 0).getTime() - new Date(right ?? 0).getTime();
}

function compareDesc(left?: string | null, right?: string | null) {
  return compareAsc(right, left);
}

function getCycleIntervalMs(speed: DemoSpeed) {
  return cycleIntervals[speed];
}

function nextRandom(state: DemoState) {
  state.randomSeed = (state.randomSeed * 1_664_525 + 1_013_904_223) % 4_294_967_296;
  return state.randomSeed / 4_294_967_296;
}

function randomInt(state: DemoState, min: number, max: number) {
  return Math.floor(nextRandom(state) * (max - min + 1)) + min;
}

function chooseFrom<T>(state: DemoState, items: T[]) {
  return items[randomInt(state, 0, items.length - 1)];
}

function createEventId(containerId: string, tick: number, suffix: string) {
  return `evt-${containerId}-${tick}-${suffix}`;
}

function buildContainerCode(state: DemoState) {
  const prefixes = ["CMAU", "HLXU", "MSKU", "OOLU", "SUDU", "TGHU"];
  let nextCode = "";

  do {
    nextCode = `${chooseFrom(state, prefixes)}${randomInt(state, 1_000_000, 9_999_999)}`;
  } while (state.containers.some((item) => item.containerCode === nextCode));

  return nextCode;
}

function buildShipName(state: DemoState) {
  let nextName = "";

  do {
    nextName = `${chooseFrom(state, shipNameStarts)} ${chooseFrom(state, shipNameEnds)}`;
  } while (state.ships.some((item) => item.name === nextName));

  return nextName;
}

function stripShip(record: ShipRecord): Ship {
  const { automation, ...ship } = record;
  void automation;
  return ship;
}

function stripCarrier(record: CarrierRecord): Carrier {
  return record;
}

function toShipReference(state: DemoState, shipId?: string | null) {
  const ship = state.ships.find((item) => item.id === shipId);

  if (!ship) {
    return null;
  }

  return {
    ...stripShip(ship),
    _count: {
      containers: state.containers.filter((item) => item.shipId === ship.id).length,
    },
  } satisfies Ship;
}

function toCarrierReference(state: DemoState, carrierId?: string | null) {
  const carrier = state.carriers.find((item) => item.id === carrierId);

  if (!carrier) {
    return null;
  }

  return {
    ...stripCarrier(carrier),
    _count: {
      containers: state.containers.filter((item) => item.carrierId === carrier.id).length,
    },
  } satisfies Carrier;
}

function toEventReference(state: DemoState, event: EventRecord): EventLog {
  const container = state.containers.find((item) => item.id === event.containerId);

  return {
    ...event,
    container: container
      ? {
          id: container.id,
          containerCode: container.containerCode,
          status: container.status,
          clientName: container.clientName,
        }
      : undefined,
  };
}

function toOccurrenceReference(
  state: DemoState,
  occurrence: OccurrenceRecord,
): OperationalOccurrence {
  const container = occurrence.sourceType === "CONTAINER"
    ? state.containers.find((item) => item.id === occurrence.sourceId)
    : null;
  const ship = occurrence.sourceType === "SHIP"
    ? state.ships.find((item) => item.id === occurrence.sourceId)
    : null;

  return {
    ...occurrence,
    container: container
      ? {
          id: container.id,
          containerCode: container.containerCode,
          status: container.status,
          clientName: container.clientName,
        }
      : undefined,
    ship: ship
      ? {
          id: ship.id,
          name: ship.name,
          status: ship.status,
          company: ship.company,
        }
      : undefined,
  };
}

function toContainerReference(state: DemoState, container: ContainerRecord): Container {
  const { automation, ...base } = container;
  void automation;
  const events = state.events
    .filter((item) => item.containerId === container.id)
    .sort((left, right) => compareAsc(left.occurredAt, right.occurredAt))
    .map((item) => toEventReference(state, item));

  return {
    ...base,
    ship: toShipReference(state, container.shipId),
    carrier: toCarrierReference(state, container.carrierId),
    events,
  };
}

function paginate<T>(items: T[], page: number, pageSize: number): PaginatedResponse<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const normalizedPage = Math.min(Math.max(page, 1), totalPages);
  const start = (normalizedPage - 1) * pageSize;

  return {
    data: items.slice(start, start + pageSize),
    meta: {
      page: normalizedPage,
      pageSize,
      total,
      totalPages,
    },
  };
}

function normalizeSearch(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function ensureContainerEvents(state: DemoState, container: ContainerRecord) {
  const ship = state.ships.find((item) => item.id === container.shipId);
  const otherEvents = state.events.filter((item) => item.containerId !== container.id);
  const generated: EventRecord[] = [];

  const pushEvent = (
    type: EventType,
    occurredAt: string,
    description: string,
    location?: string | null,
  ) => {
    generated.push({
      id: createEventId(container.id, generated.length + 1, type.toLowerCase()),
      containerId: container.id,
      type,
      title: eventTitles[type],
      description,
      location: location ?? null,
      occurredAt,
      createdAt: occurredAt,
    });
  };

  pushEvent(
    "NAVIO_PREVISTO",
    container.bookingDate ?? container.createdAt,
    ship
      ? `Reserva confirmada no navio ${ship.name} com ETA monitorado para escala em Santos.`
      : "Reserva confirmada para janela operacional de chegada ao terminal.",
    "Canal de Santos",
  );

  if (container.portEntryAt) {
    pushEvent(
      "NAVIO_CHEGOU",
      container.portEntryAt,
      ship
        ? `Navio ${ship.name} atracado com disponibilidade para descarga.`
        : "Escala confirmada e unidade recebida no porto.",
      "Berço operacional",
    );
  }

  if (container.unloadedAt) {
    pushEvent(
      "CONTAINER_DESCARREGADO",
      container.unloadedAt,
      "Descarga concluída e posicionamento em pátio operacional.",
      "Pátio alfandegado",
    );
  }

  if (container.inspectionStartedAt) {
    pushEvent(
      "EM_FISCALIZACAO",
      container.inspectionStartedAt,
      "Unidade direcionada para inspeção documental e física.",
      "Canal aduaneiro",
    );
  }

  if (container.customsReleasedAt) {
    pushEvent(
      "LIBERADO",
      container.customsReleasedAt,
      "Liberação concluída para programação rodoviária.",
      "Receita Federal",
    );
  }

  if (container.transportStartedAt) {
    pushEvent(
      "SAIU_PARA_TRANSPORTE",
      container.transportStartedAt,
      "Coleta realizada e carga despachada para o destino final.",
      container.destination,
    );
  }

  if (container.deliveredAt) {
    pushEvent(
      "ENTREGUE",
      container.deliveredAt,
      "Entrega confirmada com comprovante operacional registrado.",
      container.destination,
    );
  }

  if (container.status === "ATRASADO") {
    pushEvent(
      "STATUS_ATUALIZADO",
      container.updatedAt,
      container.notes ?? "Ocorrência operacional em investigação.",
      container.destination,
    );
  }

  state.events = [...otherEvents, ...generated].sort((left, right) =>
    compareDesc(left.occurredAt, right.occurredAt),
  );
}

function appendEvent(
  state: DemoState,
  container: ContainerRecord,
  type: EventType,
  description: string,
  location?: string | null,
) {
  const occurredAt = state.currentTime;
  state.events.unshift({
    id: createEventId(container.id, state.tick, `${type.toLowerCase()}-${state.events.length + 1}`),
    containerId: container.id,
    type,
    title: eventTitles[type],
    description,
    location: location ?? null,
    occurredAt,
    createdAt: occurredAt,
  });
}

function setContainerStatus(
  state: DemoState,
  container: ContainerRecord,
  status: ContainerStatus,
  holdTicks: number,
  delayStage?: DelayStage | null,
) {
  container.status = status;
  container.updatedAt = state.currentTime;
  container.automation.lastStatusTick = state.tick;
  container.automation.holdUntilTick = state.tick + holdTicks;
  container.automation.delayStage = delayStage ?? null;
}

function normalizeCarrierStatuses(state: DemoState) {
  for (const carrier of state.carriers) {
    const activeContainers = state.containers.filter(
      (item) =>
        item.carrierId === carrier.id &&
        ["LIBERADO", "EM_TRANSPORTE"].includes(item.status),
    ).length;

    if (activeContainers > 0) {
      carrier.status = "EM_OPERACAO";
    } else if (carrier.status !== "INATIVA") {
      carrier.status = "DISPONIVEL";
    }
  }
}

function pickCarrier(state: DemoState) {
  const candidates = state.carriers
    .filter((carrier) => carrier.status !== "INATIVA")
    .map((carrier) => ({
      carrier,
      total: state.containers.filter(
        (item) =>
          item.carrierId === carrier.id &&
          ["LIBERADO", "EM_TRANSPORTE"].includes(item.status),
      ).length,
    }))
    .sort((left, right) => left.total - right.total);

  return candidates[0]?.carrier ?? state.carriers[0] ?? null;
}

function buildInitialState() {
  const now = roundToHalfHour(new Date());
  const baseCreatedAt = addHours(now, -18);
  const currentTime = addHours(now, 0);

  const carriers: CarrierRecord[] = [
    {
      id: "carrier-portlink",
      name: "PortLink Logistics",
      cnpj: "12.345.678/0001-10",
      driverName: "Marcelo Azevedo",
      truckPlate: "FTR3P21",
      phone: "+55 13 99880-1102",
      email: "ops@portlinklog.com",
      status: "DISPONIVEL",
      createdAt: baseCreatedAt,
      updatedAt: currentTime,
    },
    {
      id: "carrier-atlas-road",
      name: "Atlas Road Cargo",
      cnpj: "54.321.789/0001-45",
      driverName: "Juliana Prado",
      truckPlate: "QWE8K54",
      phone: "+55 11 97220-4428",
      email: "dispatch@atlasroad.com.br",
      status: "EM_OPERACAO",
      createdAt: baseCreatedAt,
      updatedAt: currentTime,
    },
    {
      id: "carrier-costa-verde",
      name: "Costa Verde Transportes",
      cnpj: "66.843.210/0001-54",
      driverName: "Paulo Mendes",
      truckPlate: "SNT5A99",
      phone: "+55 13 99661-0091",
      email: "controle@costaverde.com",
      status: "DISPONIVEL",
      createdAt: baseCreatedAt,
      updatedAt: currentTime,
    },
    {
      id: "carrier-rodonave",
      name: "RodoNave Sul",
      cnpj: "88.113.220/0001-31",
      driverName: "Renata Gomes",
      truckPlate: "TRK9D40",
      phone: "+55 41 99119-2050",
      email: "fleet@rodonavesul.com.br",
      status: "INATIVA",
      createdAt: baseCreatedAt,
      updatedAt: currentTime,
    },
  ];

  const ships: ShipRecord[] = [
    {
      id: "ship-atlantic-horizon",
      name: "Atlantic Horizon",
      company: "MSC Mediterranean Shipping",
      eta: addHours(now, -2),
      etd: addHours(now, 10),
      actualArrivalAt: addHours(now, -1),
      origin: "Rotterdam",
      destination: "Santos",
      status: "DESCARREGANDO",
      expectedContainers: 18,
      createdAt: baseCreatedAt,
      updatedAt: currentTime,
      automation: { createdTick: 0, lastStatusTick: 0 },
    },
    {
      id: "ship-pacific-crown",
      name: "Pacific Crown",
      company: "Maersk Line",
      eta: addHours(now, 4),
      etd: addHours(now, 18),
      actualArrivalAt: null,
      origin: "Singapore",
      destination: "Santos",
      status: "PREVISTO",
      expectedContainers: 14,
      createdAt: baseCreatedAt,
      updatedAt: currentTime,
      automation: { createdTick: 0, lastStatusTick: 0 },
    },
    {
      id: "ship-blue-delta",
      name: "Blue Delta",
      company: "CMA CGM",
      eta: addHours(now, -3),
      etd: addHours(now, 8),
      actualArrivalAt: null,
      origin: "Busan",
      destination: "Santos",
      status: "ATRASADO",
      expectedContainers: 11,
      createdAt: baseCreatedAt,
      updatedAt: currentTime,
      automation: { createdTick: 0, lastStatusTick: 0 },
    },
    {
      id: "ship-mercury-bridge",
      name: "Mercury Bridge",
      company: "Hapag-Lloyd",
      eta: addHours(now, -16),
      etd: addHours(now, -2),
      actualArrivalAt: addHours(now, -15),
      origin: "Antwerp",
      destination: "Santos",
      status: "PARTIU",
      expectedContainers: 16,
      createdAt: baseCreatedAt,
      updatedAt: currentTime,
      automation: { createdTick: 0, lastStatusTick: 0 },
    },
  ];

  const containers: ContainerRecord[] = [
    {
      id: "container-msku5274910",
      containerCode: "MSKU5274910",
      type: "FT40",
      weight: 22_180,
      cargoDescription: "Resina PET grau alimentício",
      clientName: "Braskem",
      origin: "Rotterdam",
      destination: "Campinas/SP",
      status: "EM_FISCALIZACAO",
      shipId: "ship-atlantic-horizon",
      carrierId: "carrier-portlink",
      eta: addHours(now, -2),
      bookingDate: addHours(now, -24),
      portEntryAt: addHours(now, -1),
      unloadedAt: addMinutes(now, -50),
      inspectionStartedAt: addMinutes(now, -20),
      customsReleasedAt: null,
      transportStartedAt: null,
      deliveredAt: null,
      sealNumber: "BRK-2210",
      notes: "Canal amarelo com conferência documental em andamento.",
      createdAt: addHours(now, -24),
      updatedAt: addMinutes(now, -20),
      automation: { createdTick: 0, lastStatusTick: 0, holdUntilTick: 1, delayStage: null },
    },
    {
      id: "container-cmau7751220",
      containerCode: "CMAU7751220",
      type: "FT20",
      weight: 13_240,
      cargoDescription: "Equipamentos de automação portuária",
      clientName: "WEG",
      origin: "Rotterdam",
      destination: "Jundiaí/SP",
      status: "LIBERADO",
      shipId: "ship-atlantic-horizon",
      carrierId: "carrier-atlas-road",
      eta: addHours(now, -2),
      bookingDate: addHours(now, -26),
      portEntryAt: addHours(now, -2),
      unloadedAt: addHours(now, -1),
      inspectionStartedAt: addMinutes(now, -55),
      customsReleasedAt: addMinutes(now, -10),
      transportStartedAt: null,
      deliveredAt: null,
      sealNumber: "WEG-1192",
      notes: "Janela de coleta reservada para a próxima saída.",
      createdAt: addHours(now, -26),
      updatedAt: addMinutes(now, -10),
      automation: { createdTick: 0, lastStatusTick: 0, holdUntilTick: 1, delayStage: null },
    },
    {
      id: "container-hlxu2219484",
      containerCode: "HLXU2219484",
      type: "FT40",
      weight: 24_800,
      cargoDescription: "Chapas de aço galvanizado",
      clientName: "Usiminas",
      origin: "Antwerp",
      destination: "Contagem/MG",
      status: "EM_TRANSPORTE",
      shipId: "ship-mercury-bridge",
      carrierId: "carrier-atlas-road",
      eta: addHours(now, -14),
      bookingDate: addHours(now, -32),
      portEntryAt: addHours(now, -13),
      unloadedAt: addHours(now, -12),
      inspectionStartedAt: addHours(now, -11),
      customsReleasedAt: addHours(now, -9),
      transportStartedAt: addHours(now, -3),
      deliveredAt: null,
      sealNumber: "USI-0042",
      notes: "Veículo em deslocamento para planta industrial.",
      createdAt: addHours(now, -32),
      updatedAt: addHours(now, -3),
      automation: { createdTick: 0, lastStatusTick: 0, holdUntilTick: 1, delayStage: null },
    },
    {
      id: "container-tghu1185073",
      containerCode: "TGHU1185073",
      type: "FT20",
      weight: 17_650,
      cargoDescription: "Insumos químicos para manufatura",
      clientName: "Suzano",
      origin: "Antwerp",
      destination: "Piracicaba/SP",
      status: "ENTREGUE",
      shipId: "ship-mercury-bridge",
      carrierId: "carrier-costa-verde",
      eta: addHours(now, -16),
      bookingDate: addHours(now, -36),
      portEntryAt: addHours(now, -15),
      unloadedAt: addHours(now, -14),
      inspectionStartedAt: addHours(now, -12),
      customsReleasedAt: addHours(now, -10),
      transportStartedAt: addHours(now, -7),
      deliveredAt: addHours(now, -1),
      sealNumber: "SUZ-8301",
      notes: "Operação encerrada com recebimento confirmado.",
      createdAt: addHours(now, -36),
      updatedAt: addHours(now, -1),
      automation: { createdTick: 0, lastStatusTick: 0, holdUntilTick: 0, delayStage: null },
    },
    {
      id: "container-oolu6639120",
      containerCode: "OOLU6639120",
      type: "FT40",
      weight: 26_440,
      cargoDescription: "Papel cartão para conversão",
      clientName: "Klabin",
      origin: "Busan",
      destination: "Curitiba/PR",
      status: "ATRASADO",
      shipId: "ship-blue-delta",
      carrierId: "carrier-costa-verde",
      eta: addHours(now, -3),
      bookingDate: addHours(now, -22),
      portEntryAt: null,
      unloadedAt: null,
      inspectionStartedAt: null,
      customsReleasedAt: null,
      transportStartedAt: null,
      deliveredAt: null,
      sealNumber: "KLB-4910",
      notes: "Aguardando definição de janela de atracação após congestionamento no canal.",
      createdAt: addHours(now, -22),
      updatedAt: currentTime,
      automation: { createdTick: 0, lastStatusTick: 0, holdUntilTick: 2, delayStage: "SHIP_ARRIVAL" },
    },
    {
      id: "container-sudu4478102",
      containerCode: "SUDU4478102",
      type: "FT20",
      weight: 11_920,
      cargoDescription: "Componentes eletromecânicos industriais",
      clientName: "WEG",
      origin: "Singapore",
      destination: "Joinville/SC",
      status: "AGUARDANDO_NAVIO",
      shipId: "ship-pacific-crown",
      carrierId: "carrier-portlink",
      eta: addHours(now, 4),
      bookingDate: addHours(now, -12),
      portEntryAt: null,
      unloadedAt: null,
      inspectionStartedAt: null,
      customsReleasedAt: null,
      transportStartedAt: null,
      deliveredAt: null,
      sealNumber: "WEG-2209",
      notes: "Reserva confirmada para a próxima escala.",
      createdAt: addHours(now, -12),
      updatedAt: currentTime,
      automation: { createdTick: 0, lastStatusTick: 0, holdUntilTick: 0, delayStage: null },
    },
    {
      id: "container-msku2499104",
      containerCode: "MSKU2499104",
      type: "FT40",
      weight: 23_700,
      cargoDescription: "Resina PET grau alimentício",
      clientName: "Ambev",
      origin: "Singapore",
      destination: "Jundiaí/SP",
      status: "AGUARDANDO_NAVIO",
      shipId: "ship-pacific-crown",
      carrierId: "carrier-costa-verde",
      eta: addHours(now, 4),
      bookingDate: addHours(now, -10),
      portEntryAt: null,
      unloadedAt: null,
      inspectionStartedAt: null,
      customsReleasedAt: null,
      transportStartedAt: null,
      deliveredAt: null,
      sealNumber: "AMB-0441",
      notes: "Programação de pátio reservada para janela noturna.",
      createdAt: addHours(now, -10),
      updatedAt: currentTime,
      automation: { createdTick: 0, lastStatusTick: 0, holdUntilTick: 0, delayStage: null },
    },
    {
      id: "container-hlxu3384011",
      containerCode: "HLXU3384011",
      type: "FT20",
      weight: 15_880,
      cargoDescription: "Insumos químicos para manufatura",
      clientName: "Braskem",
      origin: "Rotterdam",
      destination: "Campinas/SP",
      status: "NO_PORTO",
      shipId: "ship-atlantic-horizon",
      carrierId: "carrier-portlink",
      eta: addHours(now, -2),
      bookingDate: addHours(now, -20),
      portEntryAt: addMinutes(now, -35),
      unloadedAt: addMinutes(now, -18),
      inspectionStartedAt: null,
      customsReleasedAt: null,
      transportStartedAt: null,
      deliveredAt: null,
      sealNumber: "BRK-9901",
      notes: "Aguardando direcionamento para canal de conferência.",
      createdAt: addHours(now, -20),
      updatedAt: addMinutes(now, -18),
      automation: { createdTick: 0, lastStatusTick: 0, holdUntilTick: 1, delayStage: null },
    },
    {
      id: "container-cmau4102761",
      containerCode: "CMAU4102761",
      type: "FT40",
      weight: 20_540,
      cargoDescription: "Componentes eletromecânicos industriais",
      clientName: "Gerdau",
      origin: "Busan",
      destination: "Sorocaba/SP",
      status: "ATRASADO",
      shipId: "ship-mercury-bridge",
      carrierId: "carrier-atlas-road",
      eta: addHours(now, -16),
      bookingDate: addHours(now, -28),
      portEntryAt: addHours(now, -14),
      unloadedAt: addHours(now, -13),
      inspectionStartedAt: addHours(now, -12),
      customsReleasedAt: addHours(now, -9),
      transportStartedAt: addHours(now, -6),
      deliveredAt: null,
      sealNumber: "GER-7711",
      notes: "Trânsito com retenção temporária na malha urbana de chegada.",
      createdAt: addHours(now, -28),
      updatedAt: addHours(now, -1),
      automation: { createdTick: 0, lastStatusTick: 0, holdUntilTick: 2, delayStage: "DELIVERY" },
    },
    {
      id: "container-sudu5548008",
      containerCode: "SUDU5548008",
      type: "FT20",
      weight: 9_420,
      cargoDescription: "Equipamentos de automação portuária",
      clientName: "JBS",
      origin: "Rotterdam",
      destination: "Campinas/SP",
      status: "LIBERADO",
      shipId: "ship-atlantic-horizon",
      carrierId: "carrier-portlink",
      eta: addHours(now, -2),
      bookingDate: addHours(now, -18),
      portEntryAt: addHours(now, -1),
      unloadedAt: addMinutes(now, -46),
      inspectionStartedAt: addMinutes(now, -38),
      customsReleasedAt: addMinutes(now, -12),
      transportStartedAt: null,
      deliveredAt: null,
      sealNumber: "JBS-0944",
      notes: "Aguardando encaixe de doca para expedição.",
      createdAt: addHours(now, -18),
      updatedAt: addMinutes(now, -12),
      automation: { createdTick: 0, lastStatusTick: 0, holdUntilTick: 1, delayStage: null },
    },
    {
      id: "container-oolu9033710",
      containerCode: "OOLU9033710",
      type: "FT40",
      weight: 25_110,
      cargoDescription: "Chapas de aço galvanizado",
      clientName: "Usiminas",
      origin: "Singapore",
      destination: "Contagem/MG",
      status: "AGUARDANDO_NAVIO",
      shipId: "ship-pacific-crown",
      carrierId: "carrier-atlas-road",
      eta: addHours(now, 4),
      bookingDate: addHours(now, -8),
      portEntryAt: null,
      unloadedAt: null,
      inspectionStartedAt: null,
      customsReleasedAt: null,
      transportStartedAt: null,
      deliveredAt: null,
      sealNumber: "USI-4331",
      notes: "Pré-alerta recebido e documentação conferida.",
      createdAt: addHours(now, -8),
      updatedAt: currentTime,
      automation: { createdTick: 0, lastStatusTick: 0, holdUntilTick: 0, delayStage: null },
    },
    {
      id: "container-tghu6601482",
      containerCode: "TGHU6601482",
      type: "FT20",
      weight: 14_770,
      cargoDescription: "Papel cartão para conversão",
      clientName: "Klabin",
      origin: "Busan",
      destination: "Curitiba/PR",
      status: "EM_TRANSPORTE",
      shipId: "ship-mercury-bridge",
      carrierId: "carrier-costa-verde",
      eta: addHours(now, -16),
      bookingDate: addHours(now, -30),
      portEntryAt: addHours(now, -15),
      unloadedAt: addHours(now, -14),
      inspectionStartedAt: addHours(now, -13),
      customsReleasedAt: addHours(now, -9),
      transportStartedAt: addHours(now, -2),
      deliveredAt: null,
      sealNumber: "KLB-2876",
      notes: "Operação rodoviária em trânsito com janela de entrega confirmada.",
      createdAt: addHours(now, -30),
      updatedAt: addHours(now, -2),
      automation: { createdTick: 0, lastStatusTick: 0, holdUntilTick: 1, delayStage: null },
    },
  ];

  const state: DemoState = {
    version: STATE_VERSION,
    tick: 457,
    currentTime,
    scenario: "STABLE",
    speed: 1,
    isRunning: true,
    randomSeed: 2_024_031_6,
    lastEngineAt: new Date().toISOString(),
    ships,
    carriers,
    containers,
    events: [],
    occurrences: [],
  };

  for (const container of state.containers) {
    ensureContainerEvents(state, container);
  }

  normalizeCarrierStatuses(state);

  return state;
}

function persistState(state: DemoState) {
  syncOperationalOccurrences(state);
  state.lastEngineAt = new Date().toISOString();

  if (!isBrowser()) {
    return state;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent(DEMO_UPDATE_EVENT, { detail: { tick: state.tick } }));

  return state;
}

function syncElapsedCycles(state: DemoState) {
  if (!state.isRunning) {
    return state;
  }

  const elapsedMs = Date.now() - new Date(state.lastEngineAt).getTime();
  const dueCycles = Math.min(
    36,
    Math.floor(elapsedMs / getCycleIntervalMs(state.speed)),
  );

  if (dueCycles <= 0) {
    return state;
  }

  const nextState = cloneValue(state);

  for (let index = 0; index < dueCycles; index += 1) {
    advanceCycle(nextState);
  }

  nextState.lastEngineAt = new Date().toISOString();

  return nextState;
}

function hydrateState() {
  if (!isBrowser()) {
    return buildInitialState();
  }

  const rawValue = localStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    const initial = buildInitialState();
    persistState(initial);
    return initial;
  }

  try {
    const parsed = JSON.parse(rawValue) as DemoState;

    if (parsed.version !== STATE_VERSION) {
      const resetState = buildInitialState();
      persistState(resetState);
      return resetState;
    }

    const syncedState = syncElapsedCycles(parsed);

    if (syncedState !== parsed) {
      persistState(syncedState);
      return syncedState;
    }

    return parsed;
  } catch {
    const resetState = buildInitialState();
    persistState(resetState);
    return resetState;
  }
}

function readState() {
  return cloneValue(hydrateState());
}

function writeState(state: DemoState) {
  return persistState(cloneValue(state));
}

function getProfile(state: DemoState) {
  return scenarioProfiles[state.scenario];
}

function updateState<T>(updater: (state: DemoState) => T) {
  const state = readState();
  const result = updater(state);
  writeState(state);
  return result;
}

function findContainerRecord(state: DemoState, containerId: string) {
  const container = state.containers.find((item) => item.id === containerId);

  if (!container) {
    throw new Error("Contêiner não encontrado.");
  }

  return container;
}

function findShipRecord(state: DemoState, shipId: string) {
  const ship = state.ships.find((item) => item.id === shipId);

  if (!ship) {
    throw new Error("Navio não encontrado.");
  }

  return ship;
}

function findCarrierRecord(state: DemoState, carrierId: string) {
  const carrier = state.carriers.find((item) => item.id === carrierId);

  if (!carrier) {
    throw new Error("Transportadora não encontrada.");
  }

  return carrier;
}

function findOccurrenceRecord(state: DemoState, occurrenceId: string) {
  const occurrence = state.occurrences.find((item) => item.id === occurrenceId);

  if (!occurrence) {
    throw new Error("Ocorrencia nao encontrada.");
  }

  return occurrence;
}

function listAllContainers(state: DemoState) {
  return state.containers
    .map((item) => toContainerReference(state, item))
    .sort((left, right) => compareDesc(left.updatedAt, right.updatedAt));
}

function listAllOccurrences(state: DemoState) {
  return state.occurrences
    .map((item) => toOccurrenceReference(state, item))
    .sort((left, right) => compareDesc(left.updatedAt, right.updatedAt));
}

function buildOccurrenceId(
  sourceType: OccurrenceSourceType,
  category: OccurrenceCategory,
  sourceId: string,
) {
  return `occ-${sourceType.toLowerCase()}-${category.toLowerCase()}-${sourceId}`;
}

function resolveOccurrenceRecord(
  state: DemoState,
  occurrence: OccurrenceRecord,
  note?: string,
) {
  occurrence.status = "RESOLVED";
  occurrence.updatedAt = state.currentTime;
  occurrence.resolvedAt = state.currentTime;
  occurrence.notes = note ?? occurrence.notes ?? "Ocorrencia normalizada pela operacao.";
}

function upsertOccurrenceRecord(
  state: DemoState,
  payload: Omit<OccurrenceRecord, "createdAt" | "updatedAt" | "resolvedAt" | "status"> & {
    status?: OccurrenceStatus;
  },
) {
  const existing = state.occurrences.find((item) => item.id === payload.id);

  if (!existing) {
    state.occurrences.unshift({
      ...payload,
      status: payload.status ?? "OPEN",
      createdAt: state.currentTime,
      updatedAt: state.currentTime,
      resolvedAt: null,
    });
    return;
  }

  existing.title = payload.title;
  existing.description = payload.description;
  existing.category = payload.category;
  existing.severity = payload.severity;
  existing.sourceType = payload.sourceType;
  existing.sourceId = payload.sourceId;
  existing.sourceLabel = payload.sourceLabel;
  existing.slaDeadlineAt = payload.slaDeadlineAt;
  existing.recommendedAction = payload.recommendedAction;
  existing.updatedAt = state.currentTime;

  if (existing.status === "RESOLVED") {
    existing.status = payload.status ?? "OPEN";
    existing.resolvedAt = null;
  }
}

function syncOperationalOccurrences(state: DemoState) {
  const desiredIds = new Set<string>();

  for (const ship of state.ships.filter((item) => item.status === "ATRASADO")) {
    const severity: OccurrenceSeverity =
      new Date(ship.eta).getTime() < new Date(state.currentTime).getTime() - 4 * 60 * MINUTE_MS
        ? "CRITICAL"
        : "HIGH";
    const id = buildOccurrenceId("SHIP", "SHIP_DELAY", ship.id);

    desiredIds.add(id);
    upsertOccurrenceRecord(state, {
      id,
      title: `Atraso de escala: ${ship.name}`,
      description: `Navio ${ship.name} segue atrasado na rota ${ship.origin} -> ${ship.destination}.`,
      category: "SHIP_DELAY",
      severity,
      sourceType: "SHIP",
      sourceId: ship.id,
      sourceLabel: ship.name,
      slaDeadlineAt: addHours(state.currentTime, severity === "CRITICAL" ? 1 : 2),
      recommendedAction: "Replanejar janela de atracacao e comunicar clientes impactados.",
      ownerName: state.occurrences.find((item) => item.id === id)?.ownerName ?? null,
      notes: state.occurrences.find((item) => item.id === id)?.notes ?? null,
    });
  }

  for (const container of state.containers.filter((item) => item.status === "ATRASADO")) {
    let category: OccurrenceCategory = "TRANSPORT_DELAY";
    let severity: OccurrenceSeverity = "HIGH";
    let title = `Interrupcao operacional: ${container.containerCode}`;
    const description = container.notes ?? "Ocorrencia operacional ativa.";
    let recommendedAction = "Revisar plano de contingencia e reprogramar proxima etapa.";

    if (container.automation.delayStage === "SHIP_ARRIVAL") {
      category = "SHIP_DELAY";
      severity = "HIGH";
      title = `Carga sem atracacao: ${container.containerCode}`;
      recommendedAction = "Acompanhar escala vinculada e revisar janela de pátio.";
    } else if (container.automation.delayStage === "CUSTOMS") {
      category = "CUSTOMS_HOLD";
      severity = "CRITICAL";
      title = `Retencao aduaneira: ${container.containerCode}`;
      recommendedAction = "Priorizar conferencia documental e contato com o despachante.";
    } else if (container.automation.delayStage === "DISPATCH") {
      category = "YARD_CONGESTION";
      severity = "MEDIUM";
      title = `Fila de retirada: ${container.containerCode}`;
      recommendedAction = "Redistribuir docas e liberar janela para expedicao.";
    } else if (container.automation.delayStage === "DELIVERY") {
      category = "TRANSPORT_DELAY";
      severity = "HIGH";
      title = `Entrega fora de janela: ${container.containerCode}`;
      recommendedAction = "Replanejar rota e alinhar novo ETA com o destinatario.";
    }

    const id = buildOccurrenceId("CONTAINER", category, container.id);
    desiredIds.add(id);
    upsertOccurrenceRecord(state, {
      id,
      title,
      description,
      category,
      severity,
      sourceType: "CONTAINER",
      sourceId: container.id,
      sourceLabel: container.containerCode,
      slaDeadlineAt: addHours(
        state.currentTime,
        severity === "CRITICAL" ? 1 : severity === "HIGH" ? 2 : 4,
      ),
      recommendedAction,
      ownerName: state.occurrences.find((item) => item.id === id)?.ownerName ?? null,
      notes: state.occurrences.find((item) => item.id === id)?.notes ?? null,
    });
  }

  const containersInPort = state.containers.filter((item) =>
    ["NO_PORTO", "EM_FISCALIZACAO", "LIBERADO"].includes(item.status),
  ).length;
  if (containersInPort >= 6) {
    const id = buildOccurrenceId("SYSTEM", "YARD_CONGESTION", "terminal-santos");
    desiredIds.add(id);
    upsertOccurrenceRecord(state, {
      id,
      title: "Congestionamento de patio",
      description: `${containersInPort} unidades aguardam liberacao ou retirada no terminal.`,
      category: "YARD_CONGESTION",
      severity: containersInPort >= 9 ? "CRITICAL" : "HIGH",
      sourceType: "SYSTEM",
      sourceId: "terminal-santos",
      sourceLabel: "Terminal Santos",
      slaDeadlineAt: addHours(state.currentTime, 2),
      recommendedAction: "Redistribuir fluxo de descarga e ampliar janelas de retirada.",
      ownerName: state.occurrences.find((item) => item.id === id)?.ownerName ?? null,
      notes: state.occurrences.find((item) => item.id === id)?.notes ?? null,
    });
  }

  const inspectionQueue = state.containers.filter(
    (item) => item.status === "EM_FISCALIZACAO",
  ).length;
  if (inspectionQueue >= 3) {
    const id = buildOccurrenceId("SYSTEM", "DOCUMENT_REVIEW", "aduana-santos");
    desiredIds.add(id);
    upsertOccurrenceRecord(state, {
      id,
      title: "Pendencias documentais acumuladas",
      description: `${inspectionQueue} unidades permanecem na fila aduaneira acima da media operacional.`,
      category: "DOCUMENT_REVIEW",
      severity: inspectionQueue >= 5 ? "CRITICAL" : "MEDIUM",
      sourceType: "SYSTEM",
      sourceId: "aduana-santos",
      sourceLabel: "Canal aduaneiro",
      slaDeadlineAt: addHours(state.currentTime, 3),
      recommendedAction: "Auditar pendencias documentais e acelerar contato com despachantes.",
      ownerName: state.occurrences.find((item) => item.id === id)?.ownerName ?? null,
      notes: state.occurrences.find((item) => item.id === id)?.notes ?? null,
    });
  }

  for (const occurrence of state.occurrences) {
    if (!desiredIds.has(occurrence.id) && occurrence.status !== "RESOLVED") {
      resolveOccurrenceRecord(state, occurrence, "Ocorrencia encerrada automaticamente apos normalizacao do fluxo.");
    }
  }
}

function applyShipArrival(state: DemoState, ship: ShipRecord) {
  ship.status = "ATRACADO";
  ship.actualArrivalAt = state.currentTime;
  ship.updatedAt = state.currentTime;
  ship.automation.lastStatusTick = state.tick;

  const linkedContainers = state.containers.filter(
    (item) =>
      item.shipId === ship.id &&
      (item.status === "AGUARDANDO_NAVIO" ||
        (item.status === "ATRASADO" && item.automation.delayStage === "SHIP_ARRIVAL")),
  );

  for (const container of linkedContainers) {
    setContainerStatus(state, container, "NO_PORTO", 1);
    container.portEntryAt = container.portEntryAt ?? state.currentTime;
    container.unloadedAt = state.currentTime;
    container.inspectionStartedAt = null;
    container.customsReleasedAt = null;
    container.transportStartedAt = null;
    container.deliveredAt = null;
    container.notes = `Descarga concluída a partir da escala ${ship.name}.`;
    appendEvent(
      state,
      container,
      "NAVIO_CHEGOU",
      `Navio ${ship.name} atracado com confirmação operacional de pátio.`,
      "Berço operacional",
    );
    appendEvent(
      state,
      container,
      "CONTAINER_DESCARREGADO",
      "Unidade descarregada e encaminhada para conferência inicial.",
      "Pátio alfandegado",
    );
  }
}

function applyInspection(state: DemoState, container: ContainerRecord) {
  setContainerStatus(state, container, "EM_FISCALIZACAO", randomInt(state, 1, 2));
  container.inspectionStartedAt = state.currentTime;
  container.notes = "Canal aduaneiro acionado para inspeção física e documental.";
  appendEvent(
    state,
    container,
    "EM_FISCALIZACAO",
    "Carga encaminhada para fiscalização aduaneira.",
    "Canal aduaneiro",
  );
}

function applyCustomsRelease(state: DemoState, container: ContainerRecord) {
  setContainerStatus(state, container, "LIBERADO", 1);
  container.customsReleasedAt = state.currentTime;
  container.notes = "Liberação aduaneira concluída e apta para programação rodoviária.";
  appendEvent(
    state,
    container,
    "LIBERADO",
    "Liberação concluída para retirada do terminal.",
    "Receita Federal",
  );
}

function applyDispatch(state: DemoState, container: ContainerRecord) {
  if (!container.carrierId) {
    container.carrierId = pickCarrier(state)?.id ?? null;
  }

  setContainerStatus(state, container, "EM_TRANSPORTE", randomInt(state, 1, 2));
  container.transportStartedAt = state.currentTime;
  container.notes = "Carga expedida e monitorada em trânsito rodoviário.";
  appendEvent(
    state,
    container,
    "SAIU_PARA_TRANSPORTE",
    "Coleta confirmada e viagem iniciada para o destino final.",
    container.destination,
  );
}

function applyDelivery(state: DemoState, container: ContainerRecord) {
  setContainerStatus(state, container, "ENTREGUE", 0);
  container.deliveredAt = state.currentTime;
  container.notes = "Entrega concluída com aceite do destinatário.";
  appendEvent(
    state,
    container,
    "ENTREGUE",
    "Recebimento confirmado e operação encerrada.",
    container.destination,
  );
}

function applyDelay(
  state: DemoState,
  container: ContainerRecord,
  delayStage: DelayStage,
  description: string,
) {
  setContainerStatus(state, container, "ATRASADO", randomInt(state, 1, 3), delayStage);
  container.notes = description;
  appendEvent(state, container, "STATUS_ATUALIZADO", description, container.destination);
}

function maybeSpawnOperation(state: DemoState) {
  const profile = getProfile(state);
  const futureShips = state.ships.filter((ship) =>
    ["PREVISTO", "ATRASADO"].includes(ship.status),
  );

  if (
    futureShips.length >= MIN_FUTURE_SHIPS &&
    state.tick % profile.spawnInterval !== 0
  ) {
    return;
  }

  const shipId = `ship-${state.tick}-${randomInt(state, 10, 99)}`;
  const eta = addHours(state.currentTime, randomInt(state, 4, 14));
  const expectedContainers = randomInt(state, 2, 5);

  const ship: ShipRecord = {
    id: shipId,
    name: buildShipName(state),
    company: chooseFrom(state, shipCompanies),
    eta,
    etd: addHours(eta, randomInt(state, 10, 18)),
    actualArrivalAt: null,
    origin: chooseFrom(state, origins),
    destination: "Santos",
    status: nextRandom(state) > 0.84 ? "ATRASADO" : "PREVISTO",
    expectedContainers,
    createdAt: state.currentTime,
    updatedAt: state.currentTime,
    automation: {
      createdTick: state.tick,
      lastStatusTick: state.tick,
    },
  };

  state.ships.unshift(ship);

  for (let index = 0; index < expectedContainers; index += 1) {
    const cargo = chooseFrom(state, cargoPool);
    const carrier = pickCarrier(state);
    const container: ContainerRecord = {
      id: `container-${state.tick}-${index + 1}-${randomInt(state, 100, 999)}`,
      containerCode: buildContainerCode(state),
      type: nextRandom(state) > 0.45 ? "FT40" : "FT20",
      weight: randomInt(state, cargo.minWeight, cargo.maxWeight),
      cargoDescription: cargo.description,
      clientName: chooseFrom(state, clientPool),
      origin: ship.origin,
      destination: chooseFrom(state, roadDestinations),
      status:
        ship.status === "ATRASADO" && nextRandom(state) > 0.4
          ? "ATRASADO"
          : "AGUARDANDO_NAVIO",
      shipId: ship.id,
      carrierId: carrier?.id ?? null,
      eta,
      bookingDate: addHours(state.currentTime, -randomInt(state, 2, 8)),
      portEntryAt: null,
      unloadedAt: null,
      inspectionStartedAt: null,
      customsReleasedAt: null,
      transportStartedAt: null,
      deliveredAt: null,
      sealNumber: `${["PF", "OP", "LG", "CT"][index % 4]}-${randomInt(state, 1000, 9999)}`,
      notes:
        ship.status === "ATRASADO"
          ? "Escala em revisão devido ao congestionamento operacional."
          : "Reserva registrada para a próxima programação de descarga.",
      createdAt: state.currentTime,
      updatedAt: state.currentTime,
      automation: {
        createdTick: state.tick,
        lastStatusTick: state.tick,
        holdUntilTick: state.tick + 1,
        delayStage: ship.status === "ATRASADO" ? "SHIP_ARRIVAL" : null,
      },
    };

    state.containers.unshift(container);
    ensureContainerEvents(state, container);
  }
}

function processShips(state: DemoState) {
  const profile = getProfile(state);

  for (const ship of state.ships) {
    if (
      ship.status === "PREVISTO" &&
      new Date(ship.eta).getTime() < new Date(state.currentTime).getTime() - 90 * MINUTE_MS
    ) {
      ship.status = "ATRASADO";
      ship.updatedAt = state.currentTime;
    }
  }

  for (const ship of state.ships) {
    const etaReached = new Date(ship.eta).getTime() <= new Date(state.currentTime).getTime();
    const shouldArrive =
      etaReached &&
      ["PREVISTO", "ATRASADO"].includes(ship.status) &&
      nextRandom(state) <= profile.arrivalRecoveryChance;

    if (shouldArrive) {
      applyShipArrival(state, ship);
      continue;
    }

    if (ship.status === "ATRACADO" && state.tick - ship.automation.lastStatusTick >= 1) {
      ship.status = "DESCARREGANDO";
      ship.updatedAt = state.currentTime;
      ship.automation.lastStatusTick = state.tick;
      continue;
    }

    if (ship.status === "DESCARREGANDO" && state.tick - ship.automation.lastStatusTick >= 3) {
      const hasPendingContainers = state.containers.some(
        (item) =>
          item.shipId === ship.id &&
          ["AGUARDANDO_NAVIO", "NO_PORTO", "EM_FISCALIZACAO", "LIBERADO"].includes(item.status),
      );

      if (!hasPendingContainers) {
        ship.status = "PARTIU";
        ship.updatedAt = state.currentTime;
        ship.automation.lastStatusTick = state.tick;
      }
    }
  }
}

function processContainers(state: DemoState) {
  const profile = getProfile(state);
  const ordered = [...state.containers].sort((left, right) =>
    compareAsc(left.updatedAt, right.updatedAt),
  );

  for (const container of ordered) {
    if (container.automation.holdUntilTick > state.tick) {
      continue;
    }

    if (
      container.status === "ATRASADO" &&
      container.automation.delayStage === "SHIP_ARRIVAL"
    ) {
      const ship = state.ships.find((item) => item.id === container.shipId);

      if (ship && ["ATRACADO", "DESCARREGANDO"].includes(ship.status)) {
        setContainerStatus(state, container, "NO_PORTO", 1);
        container.portEntryAt = state.currentTime;
        container.unloadedAt = state.currentTime;
        container.notes = `Descarga recuperada após confirmação da escala ${ship.name}.`;
        appendEvent(
          state,
          container,
          "CONTAINER_DESCARREGADO",
          "Unidade reposicionada em pátio após recuperação da escala.",
          "Pátio alfandegado",
        );
        continue;
      }
    }

    if (
      container.status === "ATRASADO" &&
      container.automation.delayStage === "CUSTOMS" &&
      nextRandom(state) > profile.customsDelayChance / 2
    ) {
      applyCustomsRelease(state, container);
      continue;
    }

    if (
      container.status === "ATRASADO" &&
      container.automation.delayStage === "DISPATCH" &&
      nextRandom(state) <= profile.dispatchChance
    ) {
      applyDispatch(state, container);
      continue;
    }

    if (
      container.status === "ATRASADO" &&
      container.automation.delayStage === "DELIVERY" &&
      nextRandom(state) <= profile.deliveryChance
    ) {
      applyDelivery(state, container);
      continue;
    }

    if (container.status === "NO_PORTO") {
      if (nextRandom(state) <= profile.inspectionChance) {
        applyInspection(state, container);
      } else {
        applyCustomsRelease(state, container);
      }
      continue;
    }

    if (container.status === "EM_FISCALIZACAO") {
      if (nextRandom(state) <= profile.customsDelayChance) {
        applyDelay(
          state,
          container,
          "CUSTOMS",
          "Fiscalização estendida por conferência adicional de documentação.",
        );
      } else {
        applyCustomsRelease(state, container);
      }
      continue;
    }

    if (container.status === "LIBERADO") {
      if (nextRandom(state) <= profile.dispatchChance) {
        applyDispatch(state, container);
      } else if (nextRandom(state) <= profile.customsDelayChance) {
        applyDelay(
          state,
          container,
          "DISPATCH",
          "Fila de retirada ajustada por indisponibilidade momentânea de janela rodoviária.",
        );
      }
      continue;
    }

    if (container.status === "EM_TRANSPORTE") {
      if (nextRandom(state) <= profile.deliveryChance) {
        applyDelivery(state, container);
      } else if (nextRandom(state) <= profile.customsDelayChance) {
        applyDelay(
          state,
          container,
          "DELIVERY",
          "Entrega reprojetada por retenção de acesso no destino final.",
        );
      }
    }
  }
}

function pruneState(state: DemoState) {
  state.events = state.events
    .filter((event) => state.containers.some((container) => container.id === event.containerId))
    .sort((left, right) => compareDesc(left.occurredAt, right.occurredAt))
    .slice(0, MAX_EVENTS);

  if (state.containers.length <= MAX_CONTAINERS) {
    return;
  }

  const removable = [...state.containers]
    .filter((container) => container.status === "ENTREGUE")
    .sort((left, right) => compareAsc(left.deliveredAt, right.deliveredAt));

  while (state.containers.length > MAX_CONTAINERS && removable.length > 0) {
    const next = removable.shift();

    if (!next) {
      break;
    }

    state.containers = state.containers.filter((container) => container.id !== next.id);
    state.events = state.events.filter((event) => event.containerId !== next.id);
  }

  if (state.occurrences.length > MAX_OCCURRENCES) {
    const preserved = state.occurrences
      .filter((occurrence) => occurrence.status !== "RESOLVED")
      .sort((left, right) => compareDesc(left.updatedAt, right.updatedAt));
    const resolved = state.occurrences
      .filter((occurrence) => occurrence.status === "RESOLVED")
      .sort((left, right) => compareDesc(left.updatedAt, right.updatedAt));

    state.occurrences = [...preserved, ...resolved].slice(0, MAX_OCCURRENCES);
  }
}

function advanceCycle(state: DemoState) {
  state.tick += 1;
  state.currentTime = addMinutes(state.currentTime, CYCLE_MINUTES);
  maybeSpawnOperation(state);
  processShips(state);
  processContainers(state);
  normalizeCarrierStatuses(state);
  pruneState(state);
}

export function ensureDemoState() {
  return hydrateState();
}

export function getSimulationRuntimeState(): SimulationRuntimeState {
  const state = readState();

  return {
    source: "LOCAL_BROWSER",
    sourceLabel: "Atualização em execução",
    persistenceLabel: "Estado persistido localmente no navegador / GitHub Pages ready",
    currentTime: state.currentTime,
    tick: state.tick,
    scenario: state.scenario,
    speed: state.speed,
    isRunning: state.isRunning,
    cycleIntervalMs: getCycleIntervalMs(state.speed),
    readyQueues: {
      ships: state.ships.filter((ship) => ["PREVISTO", "ATRASADO"].includes(ship.status)).length,
      customs: state.containers.filter((container) =>
        ["NO_PORTO", "EM_FISCALIZACAO"].includes(container.status),
      ).length,
      dispatch: state.containers.filter((container) => container.status === "LIBERADO").length,
      deliveries: state.containers.filter((container) => container.status === "EM_TRANSPORTE").length,
    },
    alerts: {
      delayedContainers: state.containers.filter((container) => container.status === "ATRASADO").length,
      delayedShips: state.ships.filter((ship) => ship.status === "ATRASADO").length,
    },
    totals: {
      containers: state.containers.length,
      inTransit: state.containers.filter((container) => container.status === "EM_TRANSPORTE").length,
      delivered: state.containers.filter((container) => container.status === "ENTREGUE").length,
    },
  };
}

export function subscribeToDemoUpdates(listener: () => void) {
  if (!isBrowser()) {
    return () => undefined;
  }

  const handler = () => listener();
  const storageHandler = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener(DEMO_UPDATE_EVENT, handler);
  window.addEventListener("storage", storageHandler);

  return () => {
    window.removeEventListener(DEMO_UPDATE_EVENT, handler);
    window.removeEventListener("storage", storageHandler);
  };
}

function scheduleDemoEngine() {
  if (!isBrowser()) {
    return;
  }

  const controller =
    window.__portflowDemoEngine__ ??
    (window.__portflowDemoEngine__ = { timerId: null, subscribers: 0 });

  if (controller.timerId !== null || controller.subscribers <= 0) {
    return;
  }

  controller.timerId = window.setTimeout(() => {
    controller.timerId = null;
    const current = hydrateState();

    if (current.isRunning) {
      updateState((state) => {
        advanceCycle(state);
      });
    }

    scheduleDemoEngine();
  }, getCycleIntervalMs(hydrateState().speed));
}

export function startDemoEngine() {
  if (!isBrowser()) {
    return () => undefined;
  }

  const controller =
    window.__portflowDemoEngine__ ??
    (window.__portflowDemoEngine__ = { timerId: null, subscribers: 0 });

  controller.subscribers += 1;
  scheduleDemoEngine();

  return () => {
    controller.subscribers = Math.max(0, controller.subscribers - 1);

    if (controller.subscribers === 0 && controller.timerId !== null) {
      window.clearTimeout(controller.timerId);
      controller.timerId = null;
    }
  };
}

function touchEngine() {
  if (!isBrowser()) {
    return;
  }

  const controller = window.__portflowDemoEngine__;

  if (!controller || controller.subscribers <= 0) {
    return;
  }

  if (controller.timerId !== null) {
    window.clearTimeout(controller.timerId);
    controller.timerId = null;
  }

  scheduleDemoEngine();
}

export function setSimulationScenario(scenario: DemoScenario) {
  updateState((state) => {
    state.scenario = scenario;
  });
  touchEngine();
}

export function setSimulationSpeed(speed: DemoSpeed) {
  updateState((state) => {
    state.speed = speed;
  });
  touchEngine();
}

export function setSimulationRunning(isRunning: boolean) {
  updateState((state) => {
    state.isRunning = isRunning;
  });
  touchEngine();
}

export function advanceSimulationCycle(amount = 1) {
  return updateState((state) => {
    for (let index = 0; index < amount; index += 1) {
      advanceCycle(state);
    }
  });
}

export function restartSimulation() {
  const nextState = buildInitialState();
  writeState(nextState);
  touchEngine();
}

export function listDemoContainers(filters: {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  origin?: string;
  destination?: string;
  shipId?: string;
  carrierId?: string;
}) {
  const search = normalizeSearch(filters.search);

  const items = listAllContainers(readState()).filter((container) => {
    if (search) {
      const haystack = [
        container.containerCode,
        container.clientName,
        container.cargoDescription,
      ]
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(search)) {
        return false;
      }
    }

    if (filters.status && container.status !== filters.status) {
      return false;
    }

    if (
      filters.origin &&
      !container.origin.toLowerCase().includes(filters.origin.toLowerCase())
    ) {
      return false;
    }

    if (
      filters.destination &&
      !container.destination.toLowerCase().includes(filters.destination.toLowerCase())
    ) {
      return false;
    }

    if (filters.shipId && container.shipId !== filters.shipId) {
      return false;
    }

    if (filters.carrierId && container.carrierId !== filters.carrierId) {
      return false;
    }

    return true;
  });

  return paginate(items, filters.page, filters.pageSize);
}

export function getDemoContainer(containerId: string) {
  const state = readState();
  const container = findContainerRecord(state, containerId);
  return toContainerReference(state, container);
}

export function trackDemoContainer(containerCode: string) {
  const state = readState();
  const container = state.containers.find(
    (item) => item.containerCode.toUpperCase() === containerCode.toUpperCase(),
  );

  if (!container) {
    throw new Error("Contêiner não encontrado.");
  }

  return toContainerReference(state, container);
}

export function createDemoContainer(payload: ContainerPayload) {
  return updateState((state) => {
    const container: ContainerRecord = {
      id: `container-${state.tick}-${randomInt(state, 1_000, 9_999)}`,
      containerCode: payload.containerCode.trim().toUpperCase(),
      type: payload.type,
      weight: payload.weight,
      cargoDescription: payload.cargoDescription,
      clientName: payload.clientName,
      origin: payload.origin,
      destination: payload.destination,
      status: payload.status ?? "AGUARDANDO_NAVIO",
      shipId: payload.shipId ?? null,
      carrierId: payload.carrierId ?? null,
      eta: payload.eta ?? null,
      bookingDate: payload.bookingDate ?? state.currentTime,
      portEntryAt: payload.portEntryAt ?? null,
      unloadedAt: payload.unloadedAt ?? null,
      inspectionStartedAt: payload.inspectionStartedAt ?? null,
      customsReleasedAt: payload.customsReleasedAt ?? null,
      transportStartedAt: payload.transportStartedAt ?? null,
      deliveredAt: payload.deliveredAt ?? null,
      sealNumber: payload.sealNumber ?? null,
      notes: payload.notes ?? "Registro manual incluído na torre operacional.",
      createdAt: state.currentTime,
      updatedAt: state.currentTime,
      automation: {
        createdTick: state.tick,
        lastStatusTick: state.tick,
        holdUntilTick: state.tick + 1,
        delayStage: null,
      },
    };

    state.containers.unshift(container);
    ensureContainerEvents(state, container);
    normalizeCarrierStatuses(state);

    return toContainerReference(state, container);
  });
}

export function updateDemoContainer(
  containerId: string,
  payload: Partial<ContainerPayload>,
) {
  return updateState((state) => {
    const container = findContainerRecord(state, containerId);

    Object.assign(container, {
      ...payload,
      containerCode: payload.containerCode?.trim().toUpperCase() ?? container.containerCode,
      updatedAt: state.currentTime,
    });

    container.automation.lastStatusTick = state.tick;
    ensureContainerEvents(state, container);
    normalizeCarrierStatuses(state);

    return toContainerReference(state, container);
  });
}

export function deleteDemoContainer(containerId: string) {
  return updateState((state) => {
    findContainerRecord(state, containerId);
    state.containers = state.containers.filter((item) => item.id !== containerId);
    state.events = state.events.filter((item) => item.containerId !== containerId);
    normalizeCarrierStatuses(state);
    return { success: true };
  });
}

export function listDemoShips(filters: {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  origin?: string;
  destination?: string;
}) {
  const state = readState();
  const search = normalizeSearch(filters.search);

  const items = state.ships
    .map((ship) => ({
      ...stripShip(ship),
      _count: {
        containers: state.containers.filter((container) => container.shipId === ship.id).length,
      },
    }))
    .filter((ship) => {
      if (search && !`${ship.name} ${ship.company}`.toLowerCase().includes(search)) {
        return false;
      }

      if (filters.status && ship.status !== filters.status) {
        return false;
      }

      if (
        filters.origin &&
        !ship.origin.toLowerCase().includes(filters.origin.toLowerCase())
      ) {
        return false;
      }

      if (
        filters.destination &&
        !ship.destination.toLowerCase().includes(filters.destination.toLowerCase())
      ) {
        return false;
      }

      return true;
    })
    .sort((left, right) => compareAsc(left.eta, right.eta));

  return paginate(items, filters.page, filters.pageSize);
}

export function getDemoShip(shipId: string) {
  const state = readState();
  const ship = findShipRecord(state, shipId);

  return {
    ...stripShip(ship),
    _count: {
      containers: state.containers.filter((container) => container.shipId === ship.id).length,
    },
  } satisfies Ship;
}

export function createDemoShip(payload: ShipPayload) {
  return updateState((state) => {
    const ship: ShipRecord = {
      id: `ship-${state.tick}-${randomInt(state, 100, 999)}`,
      name: payload.name,
      company: payload.company,
      eta: payload.eta,
      etd: payload.etd ?? null,
      actualArrivalAt: null,
      origin: payload.origin,
      destination: payload.destination,
      status: payload.status ?? "PREVISTO",
      expectedContainers: payload.expectedContainers,
      createdAt: state.currentTime,
      updatedAt: state.currentTime,
      automation: { createdTick: state.tick, lastStatusTick: state.tick },
    };

    state.ships.unshift(ship);
    return { ...stripShip(ship), _count: { containers: 0 } } satisfies Ship;
  });
}

export function updateDemoShip(shipId: string, payload: Partial<ShipPayload>) {
  return updateState((state) => {
    const ship = findShipRecord(state, shipId);
    Object.assign(ship, { ...payload, updatedAt: state.currentTime });
    ship.automation.lastStatusTick = state.tick;

    return {
      ...stripShip(ship),
      _count: {
        containers: state.containers.filter((container) => container.shipId === ship.id).length,
      },
    } satisfies Ship;
  });
}

export function deleteDemoShip(shipId: string) {
  return updateState((state) => {
    findShipRecord(state, shipId);
    state.ships = state.ships.filter((ship) => ship.id !== shipId);

    for (const container of state.containers) {
      if (container.shipId === shipId) {
        container.shipId = null;
        container.status = "AGUARDANDO_NAVIO";
        container.notes = "Navio desvinculado; aguardando nova escala.";
        container.updatedAt = state.currentTime;
        ensureContainerEvents(state, container);
      }
    }

    return { success: true };
  });
}

export function listDemoCarriers(filters: {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
}) {
  const state = readState();
  const search = normalizeSearch(filters.search);

  const items = state.carriers
    .map((carrier) => ({
      ...stripCarrier(carrier),
      _count: {
        containers: state.containers.filter(
          (container) => container.carrierId === carrier.id,
        ).length,
      },
    }))
    .filter((carrier) => {
      if (
        search &&
        !`${carrier.name} ${carrier.driverName} ${carrier.cnpj}`.toLowerCase().includes(search)
      ) {
        return false;
      }

      if (filters.status && carrier.status !== filters.status) {
        return false;
      }

      return true;
    })
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));

  return paginate(items, filters.page, filters.pageSize);
}

export function getDemoCarrier(carrierId: string) {
  const state = readState();
  const carrier = findCarrierRecord(state, carrierId);

  return {
    ...stripCarrier(carrier),
    _count: {
      containers: state.containers.filter((container) => container.carrierId === carrier.id).length,
    },
  } satisfies Carrier;
}

export function createDemoCarrier(payload: CarrierPayload) {
  return updateState((state) => {
    const carrier: CarrierRecord = {
      id: `carrier-${state.tick}-${randomInt(state, 100, 999)}`,
      name: payload.name,
      cnpj: payload.cnpj,
      driverName: payload.driverName,
      truckPlate: payload.truckPlate,
      phone: payload.phone,
      email: payload.email,
      status: payload.status ?? "DISPONIVEL",
      createdAt: state.currentTime,
      updatedAt: state.currentTime,
    };

    state.carriers.unshift(carrier);
    return { ...stripCarrier(carrier), _count: { containers: 0 } } satisfies Carrier;
  });
}

export function updateDemoCarrier(
  carrierId: string,
  payload: Partial<CarrierPayload>,
) {
  return updateState((state) => {
    const carrier = findCarrierRecord(state, carrierId);
    Object.assign(carrier, { ...payload, updatedAt: state.currentTime });
    normalizeCarrierStatuses(state);

    return {
      ...stripCarrier(carrier),
      _count: {
        containers: state.containers.filter((container) => container.carrierId === carrier.id).length,
      },
    } satisfies Carrier;
  });
}

export function deleteDemoCarrier(carrierId: string) {
  return updateState((state) => {
    findCarrierRecord(state, carrierId);
    state.carriers = state.carriers.filter((carrier) => carrier.id !== carrierId);

    for (const container of state.containers) {
      if (container.carrierId === carrierId) {
        container.carrierId = pickCarrier(state)?.id ?? null;
        container.updatedAt = state.currentTime;
      }
    }

    normalizeCarrierStatuses(state);

    return { success: true };
  });
}

export function listDemoEvents(filters: {
  page: number;
  pageSize: number;
  type?: string;
  containerId?: string;
}) {
  const state = readState();
  const items = state.events
    .filter((event) => {
      if (filters.type && event.type !== filters.type) {
        return false;
      }

      if (filters.containerId && event.containerId !== filters.containerId) {
        return false;
      }

      return true;
    })
    .sort((left, right) => compareDesc(left.occurredAt, right.occurredAt))
    .map((event) => toEventReference(state, event));

  return paginate(items, filters.page, filters.pageSize);
}

export function getDemoContainerEvents(containerId: string) {
  const state = readState();

  return state.events
    .filter((event) => event.containerId === containerId)
    .sort((left, right) => compareDesc(left.occurredAt, right.occurredAt))
    .map((event) => toEventReference(state, event));
}

export function listDemoOccurrences(filters: {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  severity?: string;
  category?: string;
}) {
  const state = readState();
  const search = normalizeSearch(filters.search);
  const items = listAllOccurrences(state).filter((occurrence) => {
    if (search) {
      const haystack = [
        occurrence.title,
        occurrence.description,
        occurrence.sourceLabel,
        occurrence.ownerName ?? "",
      ]
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(search)) {
        return false;
      }
    }

    if (filters.status && occurrence.status !== filters.status) {
      return false;
    }

    if (filters.severity && occurrence.severity !== filters.severity) {
      return false;
    }

    if (filters.category && occurrence.category !== filters.category) {
      return false;
    }

    return true;
  });

  return paginate(items, filters.page, filters.pageSize);
}

export function getDemoOccurrence(occurrenceId: string) {
  const state = readState();
  return toOccurrenceReference(state, findOccurrenceRecord(state, occurrenceId));
}

export function assignDemoOccurrence(occurrenceId: string, ownerName: string) {
  return updateState((state) => {
    const occurrence = findOccurrenceRecord(state, occurrenceId);
    occurrence.ownerName = ownerName;
    occurrence.updatedAt = state.currentTime;

    if (occurrence.status === "OPEN") {
      occurrence.status = "IN_PROGRESS";
    }

    return toOccurrenceReference(state, occurrence);
  });
}

export function updateDemoOccurrenceStatus(
  occurrenceId: string,
  status: OccurrenceStatus,
  note?: string,
) {
  return updateState((state) => {
    const occurrence = findOccurrenceRecord(state, occurrenceId);
    occurrence.status = status;
    occurrence.updatedAt = state.currentTime;

    if (status === "RESOLVED") {
      occurrence.resolvedAt = state.currentTime;
    } else {
      occurrence.resolvedAt = null;
    }

    if (note) {
      occurrence.notes = note;
    }

    return toOccurrenceReference(state, occurrence);
  });
}

export function simulateDemoShipArrival(shipId: string) {
  return updateState((state) => {
    const ship = findShipRecord(state, shipId);
    applyShipArrival(state, ship);
    normalizeCarrierStatuses(state);

    return {
      ...stripShip(ship),
      _count: {
        containers: state.containers.filter((container) => container.shipId === ship.id).length,
      },
    } satisfies Ship;
  });
}

export function simulateDemoCustomsRelease(containerId: string) {
  return updateState((state) => {
    const container = findContainerRecord(state, containerId);
    applyCustomsRelease(state, container);
    normalizeCarrierStatuses(state);
    return toContainerReference(state, container);
  });
}

export function simulateDemoDispatch(containerId: string) {
  return updateState((state) => {
    const container = findContainerRecord(state, containerId);
    applyDispatch(state, container);
    normalizeCarrierStatuses(state);
    return toContainerReference(state, container);
  });
}

export function simulateDemoDelivery(containerId: string) {
  return updateState((state) => {
    const container = findContainerRecord(state, containerId);
    applyDelivery(state, container);
    normalizeCarrierStatuses(state);
    return toContainerReference(state, container);
  });
}

export function getDemoDashboardOverview(): DashboardOverview {
  const state = readState();
  const containers = listAllContainers(state);
  const occurrences = listAllOccurrences(state);
  const recentEvents = state.events
    .sort((left, right) => compareDesc(left.occurredAt, right.occurredAt))
    .slice(0, 6)
    .map((event) => toEventReference(state, event));

  const movementMap = new Map<
    string,
    { totalMovements: number; discharges: number; deliveries: number }
  >();

  for (let index = 6; index >= 0; index -= 1) {
    const date = new Date(addHours(state.currentTime, -index * 24));
    const key = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    movementMap.set(key, { totalMovements: 0, discharges: 0, deliveries: 0 });
  }

  for (const event of state.events) {
    const key = new Date(event.occurredAt).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
    const entry = movementMap.get(key);

    if (!entry) {
      continue;
    }

    entry.totalMovements += 1;

    if (event.type === "CONTAINER_DESCARREGADO") {
      entry.discharges += 1;
    }

    if (event.type === "ENTREGUE") {
      entry.deliveries += 1;
    }
  }

  const volumeByClient = Array.from(
    containers.reduce((accumulator, container) => {
      const entry = accumulator.get(container.clientName) ?? {
        client: container.clientName,
        totalContainers: 0,
        totalWeight: 0,
      };

      entry.totalContainers += 1;
      entry.totalWeight += container.weight;
      accumulator.set(container.clientName, entry);

      return accumulator;
    }, new Map<string, { client: string; totalContainers: number; totalWeight: number }>()),
  )
    .map(([, value]) => value)
    .sort((left, right) => right.totalContainers - left.totalContainers);

  const deliveredContainers = containers.filter((container) => container.status === "ENTREGUE");
  const openOccurrences = occurrences.filter((occurrence) => occurrence.status !== "RESOLVED");
  const criticalOccurrences = openOccurrences.filter(
    (occurrence) => occurrence.severity === "CRITICAL",
  );
  const averageDeliveryTimeHours =
    deliveredContainers.length > 0
      ? Math.round(
          deliveredContainers.reduce((total, container) => {
            return total + diffHours(container.portEntryAt, container.deliveredAt);
          }, 0) / deliveredContainers.length,
        )
      : 0;

  return {
    kpis: {
      containersInPort: containers.filter((container) =>
        ["NO_PORTO", "EM_FISCALIZACAO", "LIBERADO"].includes(container.status),
      ).length,
      containersInTransport: containers.filter(
        (container) => container.status === "EM_TRANSPORTE",
      ).length,
      containersDelivered: deliveredContainers.length,
      awaitingClearance: containers.filter(
        (container) => container.status === "EM_FISCALIZACAO",
      ).length,
      expectedShips: state.ships.filter((ship) =>
        ["PREVISTO", "ATRASADO"].includes(ship.status),
      ).length,
      averageDeliveryTimeHours,
      openOccurrences: openOccurrences.length,
      criticalOccurrences: criticalOccurrences.length,
    },
    statusDistribution: (
      [
        "AGUARDANDO_NAVIO",
        "NO_PORTO",
        "EM_FISCALIZACAO",
        "LIBERADO",
        "EM_TRANSPORTE",
        "ENTREGUE",
        "ATRASADO",
      ] as ContainerStatus[]
    ).map((status) => ({
      status,
      total: containers.filter((container) => container.status === status).length,
    })),
    movementByDay: Array.from(movementMap.entries()).map(([day, value]) => ({
      day,
      totalMovements: value.totalMovements,
      discharges: value.discharges,
      deliveries: value.deliveries,
    })),
    volumeByClient,
    upcomingShips: state.ships
      .map((ship) => ({
        ...stripShip(ship),
        _count: {
          containers: state.containers.filter((container) => container.shipId === ship.id).length,
        },
      }))
      .filter((ship) => ship.status !== "PARTIU")
      .sort((left, right) => compareAsc(left.eta, right.eta))
      .slice(0, 4),
    delayedContainers: containers
      .filter((container) => container.status === "ATRASADO")
      .sort((left, right) => compareDesc(left.updatedAt, right.updatedAt))
      .slice(0, 4),
    recentEvents,
    recentOccurrences: occurrences.slice(0, 6),
    occurrenceBySeverity: (
      ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as OccurrenceSeverity[]
    ).map((severity) => ({
      severity,
      total: openOccurrences.filter((occurrence) => occurrence.severity === severity).length,
    })),
  };
}
