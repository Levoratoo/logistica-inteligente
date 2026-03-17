export type ContainerType = "FT20" | "FT40";
export type ContainerStatus =
  | "AGUARDANDO_NAVIO"
  | "NO_PORTO"
  | "EM_FISCALIZACAO"
  | "LIBERADO"
  | "EM_TRANSPORTE"
  | "ENTREGUE"
  | "ATRASADO";
export type ShipStatus =
  | "PREVISTO"
  | "ATRACADO"
  | "DESCARREGANDO"
  | "PARTIU"
  | "ATRASADO";
export type CarrierStatus = "DISPONIVEL" | "EM_OPERACAO" | "INATIVA";
export type OccurrenceSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type OccurrenceStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";
export type OccurrenceCategory =
  | "SHIP_DELAY"
  | "CUSTOMS_HOLD"
  | "YARD_CONGESTION"
  | "TRANSPORT_DELAY"
  | "DOCUMENT_REVIEW";
export type OccurrenceSourceType = "CONTAINER" | "SHIP" | "SYSTEM";
export type ContainerDocumentType =
  | "BILL_OF_LADING"
  | "COMMERCIAL_INVOICE"
  | "PACKING_LIST"
  | "IMPORT_DECLARATION"
  | "CUSTOMS_CLEARANCE"
  | "TRANSPORT_ORDER"
  | "DELIVERY_APPOINTMENT"
  | "PROOF_OF_DELIVERY";
export type ContainerDocumentStatus =
  | "MISSING"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED";
export type ContainerDocumentStage =
  | "CUSTOMS_RELEASE"
  | "DISPATCH"
  | "DELIVERY";
export type ControlTowerActionType =
  | "SHIP_ARRIVAL"
  | "CUSTOMS_RELEASE"
  | "DISPATCH"
  | "DELIVERY"
  | "ADVANCE_CYCLE";
export type ControlTowerTone = "STABLE" | "WATCH" | "CRITICAL";
export type YardTone = "STABLE" | "WATCH" | "CRITICAL";
export type YardSlotState = "OCCUPIED" | "RESERVED" | "BLOCKED" | "EMPTY";
export type BerthStatus = "OPERATING" | "BOOKED" | "WATCH" | "FREE";
export type EventType =
  | "NAVIO_PREVISTO"
  | "NAVIO_CHEGOU"
  | "CONTAINER_DESCARREGADO"
  | "EM_FISCALIZACAO"
  | "LIBERADO"
  | "SAIU_PARA_TRANSPORTE"
  | "ENTREGUE"
  | "STATUS_ATUALIZADO";

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};

export type Ship = {
  id: string;
  name: string;
  company: string;
  eta: string;
  etd?: string | null;
  actualArrivalAt?: string | null;
  origin: string;
  destination: string;
  status: ShipStatus;
  expectedContainers: number;
  createdAt: string;
  updatedAt: string;
  containers?: Container[];
  _count?: {
    containers: number;
  };
};

export type Carrier = {
  id: string;
  name: string;
  cnpj: string;
  driverName: string;
  truckPlate: string;
  phone: string;
  email: string;
  status: CarrierStatus;
  createdAt: string;
  updatedAt: string;
  containers?: Container[];
  _count?: {
    containers: number;
  };
};

export type EventLog = {
  id: string;
  containerId: string;
  type: EventType;
  title: string;
  description: string;
  location?: string | null;
  occurredAt: string;
  createdAt: string;
  container?: Pick<Container, "id" | "containerCode" | "status" | "clientName">;
};

export type OperationalOccurrence = {
  id: string;
  title: string;
  description: string;
  category: OccurrenceCategory;
  severity: OccurrenceSeverity;
  status: OccurrenceStatus;
  sourceType: OccurrenceSourceType;
  sourceId?: string | null;
  sourceLabel: string;
  ownerName?: string | null;
  slaDeadlineAt?: string | null;
  recommendedAction: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  container?: Pick<Container, "id" | "containerCode" | "status" | "clientName">;
  ship?: Pick<Ship, "id" | "name" | "status" | "company">;
};

export type ContainerDocument = {
  id: string;
  type: ContainerDocumentType;
  status: ContainerDocumentStatus;
  requiredFor: ContainerDocumentStage[];
  label: string;
  updatedAt: string;
  reviewedBy?: string | null;
  notes?: string | null;
};

export type ContainerDocumentWorkflow = {
  customsReady: boolean;
  dispatchReady: boolean;
  deliveryReady: boolean;
  blockedStages: ContainerDocumentStage[];
  missingDocuments: number;
  pendingDocuments: number;
  approvedDocuments: number;
  blockingReason?: string | null;
};

export type Container = {
  id: string;
  containerCode: string;
  type: ContainerType;
  weight: number;
  cargoDescription: string;
  clientName: string;
  origin: string;
  destination: string;
  status: ContainerStatus;
  shipId?: string | null;
  carrierId?: string | null;
  eta?: string | null;
  bookingDate?: string | null;
  portEntryAt?: string | null;
  unloadedAt?: string | null;
  inspectionStartedAt?: string | null;
  customsReleasedAt?: string | null;
  transportStartedAt?: string | null;
  deliveredAt?: string | null;
  sealNumber?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  documents?: ContainerDocument[];
  documentWorkflow?: ContainerDocumentWorkflow;
  ship?: Ship | null;
  carrier?: Carrier | null;
  events?: EventLog[];
};

export type DashboardOverview = {
  kpis: {
    containersInPort: number;
    containersInTransport: number;
    containersDelivered: number;
    awaitingClearance: number;
    expectedShips: number;
    averageDeliveryTimeHours: number;
    openOccurrences: number;
    criticalOccurrences: number;
  };
  statusDistribution: Array<{
    status: ContainerStatus;
    total: number;
  }>;
  movementByDay: Array<{
    day: string;
    totalMovements: number;
    discharges: number;
    deliveries: number;
  }>;
  volumeByClient: Array<{
    client: string;
    totalContainers: number;
    totalWeight: number;
  }>;
  upcomingShips: Ship[];
  delayedContainers: Container[];
  recentEvents: EventLog[];
  recentOccurrences: OperationalOccurrence[];
  occurrenceBySeverity: Array<{
    severity: OccurrenceSeverity;
    total: number;
  }>;
};

export type ControlTowerPriorityItem = {
  id: string;
  title: string;
  description: string;
  severity: OccurrenceSeverity;
  occurrenceId?: string | null;
  occurrenceStatus?: OccurrenceStatus | null;
  dueAt?: string | null;
  ownerName?: string | null;
  sourceLabel: string;
  actionType: ControlTowerActionType;
  actionLabel: string;
  targetId?: string | null;
  routeHref: string;
  category?: OccurrenceCategory | null;
};

export type ControlTowerLanePressure = {
  id: string;
  title: string;
  total: number;
  helper: string;
  tone: ControlTowerTone;
};

export type ControlTowerOverview = {
  currentTime: string;
  scenarioLabel: string;
  isRunning: boolean;
  readinessScore: number;
  pressureLabel: string;
  primaryFocus: string;
  kpis: {
    actionQueue: number;
    overdueSlas: number;
    dueSoonSlas: number;
    resolvedLast24h: number;
  };
  lanePressure: ControlTowerLanePressure[];
  priorityQueue: ControlTowerPriorityItem[];
  slaWatch: {
    overdue: OperationalOccurrence[];
    dueSoon: OperationalOccurrence[];
    onTrack: OperationalOccurrence[];
  };
  shipsApproaching: Ship[];
  containersNeedingAttention: Container[];
};

export type YardSlot = {
  id: string;
  state: YardSlotState;
  label: string;
  containerId?: string | null;
  containerCode?: string | null;
};

export type YardZone = {
  id: string;
  code: string;
  name: string;
  capacity: number;
  occupied: number;
  reserved: number;
  blocked: number;
  free: number;
  utilization: number;
  tone: YardTone;
  focusLabel: string;
  containers: Array<Pick<Container, "id" | "containerCode" | "status" | "clientName">>;
  slots: YardSlot[];
};

export type BerthWindow = {
  id: string;
  name: string;
  status: BerthStatus;
  tone: YardTone;
  note: string;
  startAt?: string | null;
  endAt?: string | null;
  ship?: Pick<Ship, "id" | "name" | "status" | "company" | "origin" | "destination" | "eta" | "etd"> | null;
  nextShip?: Pick<Ship, "id" | "name" | "status" | "company" | "origin" | "destination" | "eta" | "etd"> | null;
  load: number;
};

export type YardHotspot = {
  id: string;
  title: string;
  description: string;
  tone: YardTone;
  routeHref: string;
};

export type YardOperationsOverview = {
  currentTime: string;
  occupancyRate: number;
  occupiedSlots: number;
  freeSlots: number;
  reservedSlots: number;
  blockedSlots: number;
  activeBerths: number;
  nextArrivals: number;
  zones: YardZone[];
  berthSchedule: BerthWindow[];
  hotspots: YardHotspot[];
};

export type ContainerPayload = {
  containerCode: string;
  type: ContainerType;
  weight: number;
  cargoDescription: string;
  clientName: string;
  origin: string;
  destination: string;
  status?: ContainerStatus;
  shipId?: string;
  carrierId?: string;
  eta?: string;
  bookingDate?: string;
  portEntryAt?: string;
  unloadedAt?: string;
  inspectionStartedAt?: string;
  customsReleasedAt?: string;
  transportStartedAt?: string;
  deliveredAt?: string;
  sealNumber?: string;
  notes?: string;
};

export type ShipPayload = {
  name: string;
  company: string;
  eta: string;
  etd?: string;
  origin: string;
  destination: string;
  status?: ShipStatus;
  expectedContainers: number;
};

export type CarrierPayload = {
  name: string;
  cnpj: string;
  driverName: string;
  truckPlate: string;
  phone: string;
  email: string;
  status?: CarrierStatus;
};
