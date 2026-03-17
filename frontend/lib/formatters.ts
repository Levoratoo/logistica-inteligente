import type {
  CarrierStatus,
  ContainerStatus,
  ContainerType,
  EventType,
  OccurrenceCategory,
  OccurrenceSeverity,
  OccurrenceStatus,
  ShipStatus,
} from "@/types/api";

const intlDate = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const statusLabels: Record<
  ContainerStatus | ShipStatus | CarrierStatus | EventType | ContainerType,
  string
> = {
  AGUARDANDO_NAVIO: "Aguardando navio",
  NO_PORTO: "No porto",
  EM_FISCALIZACAO: "Em fiscalização",
  LIBERADO: "Liberado",
  EM_TRANSPORTE: "Em transporte",
  ENTREGUE: "Entregue",
  ATRASADO: "Atrasado",
  PREVISTO: "Previsto",
  ATRACADO: "Atracado",
  DESCARREGANDO: "Descarregando",
  PARTIU: "Partiu",
  DISPONIVEL: "Disponível",
  EM_OPERACAO: "Em operação",
  INATIVA: "Inativa",
  NAVIO_PREVISTO: "Navio previsto",
  NAVIO_CHEGOU: "Navio chegou",
  CONTAINER_DESCARREGADO: "Contêiner descarregado",
  SAIU_PARA_TRANSPORTE: "Saiu para transporte",
  STATUS_ATUALIZADO: "Status atualizado",
  FT20: "20ft",
  FT40: "40ft",
};

export function formatDateTime(value?: string | null) {
  if (!value) {
    return "Sem data";
  }

  return intlDate.format(new Date(value));
}

export function formatWeight(value: number) {
  return `${new Intl.NumberFormat("pt-BR").format(value)} kg`;
}

export function formatStatusLabel(
  value:
    | ContainerStatus
    | ShipStatus
    | CarrierStatus
    | EventType
    | ContainerType,
) {
  return statusLabels[value] ?? value;
}

export function formatOccurrenceSeverity(
  value: OccurrenceSeverity,
) {
  const labels: Record<OccurrenceSeverity, string> = {
    LOW: "Baixa",
    MEDIUM: "Media",
    HIGH: "Alta",
    CRITICAL: "Critica",
  };

  return labels[value] ?? value;
}

export function formatOccurrenceStatus(
  value: OccurrenceStatus,
) {
  const labels: Record<OccurrenceStatus, string> = {
    OPEN: "Aberta",
    IN_PROGRESS: "Em tratamento",
    RESOLVED: "Resolvida",
  };

  return labels[value] ?? value;
}

export function formatOccurrenceCategory(
  value: OccurrenceCategory,
) {
  const labels: Record<OccurrenceCategory, string> = {
    SHIP_DELAY: "Atraso de navio",
    CUSTOMS_HOLD: "Retencao aduaneira",
    YARD_CONGESTION: "Congestionamento de patio",
    TRANSPORT_DELAY: "Atraso de transporte",
    DOCUMENT_REVIEW: "Pendencia documental",
  };

  return labels[value] ?? value;
}

export function toDateTimeLocalValue(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const normalized = new Date(date.getTime() - offset * 60 * 1000);
  return normalized.toISOString().slice(0, 16);
}
