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
