import type { Container, Carrier, OccurrenceSeverity, OccurrenceStatus } from "@/types/api";
import { getSimulationRuntime } from "@/services/simulations-service";
import { listCarriers } from "@/services/carriers-service";
import { listContainers } from "@/services/containers-service";
import { listOccurrences } from "@/services/occurrences-service";
import { formatDateTime } from "@/lib/formatters";

export type ReportPeriod = "ALL" | "LAST_7_DAYS" | "LAST_30_DAYS" | "LAST_90_DAYS";
export type ReportSlaFilter = "ALL" | "OVERDUE" | "DUE_SOON" | "OPEN" | "RESOLVED";
export type ReportExportScope = "CLIENT" | "CARRIER" | "SLA" | "PERFORMANCE";

export type ReportFilters = {
  period: ReportPeriod;
  clientName?: string;
  carrierId?: string;
  slaFilter: ReportSlaFilter;
};

export type ReportKpi = {
  totalContainers: number;
  containersInTransit: number;
  containersDelivered: number;
  containersDelayed: number;
  containersWithDocHold: number;
  activeOccurrences: number;
  resolvedOccurrences: number;
  overdueSla: number;
  dueSoonSla: number;
  averageDeliveryHours: number;
  onTimeDeliveryRate: number;
};

export type ReportClientRow = {
  clientName: string;
  totalContainers: number;
  inTransit: number;
  delayed: number;
  delivered: number;
  avgDeliveryHours: number;
  onTimeRate: number;
  pendingDocuments: number;
  openOccurrences: number;
  overdueOccurrences: number;
};

export type ReportCarrierRow = {
  carrierId: string;
  carrierName: string;
  truckPlate: string;
  totalContainers: number;
  inTransit: number;
  delayed: number;
  delivered: number;
  avgDeliveryHours: number;
  onTimeRate: number;
  pendingDocuments: number;
  openOccurrences: number;
};

export type ReportSlaRow = {
  id: string;
  title: string;
  containerCode: string;
  clientName: string;
  carrierName: string;
  category: string;
  severity: OccurrenceSeverity;
  status: OccurrenceStatus;
  dueAt: string;
  createdAt: string;
  updatedAt: string;
  slaStatus: "OVERDUE" | "DUE_SOON" | "ON_TRACK" | "NO_SLA";
  slaDeltaLabel: string;
  ownerName: string;
};

export type ReportPerformanceRow = {
  containerId: string;
  containerCode: string;
  clientName: string;
  carrierName: string;
  status: string;
  updatedAt: string;
  deliveryHours: string;
  riskScore: number;
  slaImpact: "OVERDUE" | "DUE_SOON" | "OPEN" | "RESOLVED" | "NONE";
  docsBlocked: number;
};

export type ReportSnapshot = {
  filters: ReportFilters;
  generatedAt: string;
  periodLabel: string;
  kpis: ReportKpi;
  clients: ReportClientRow[];
  carriers: ReportCarrierRow[];
  slaRows: ReportSlaRow[];
  performanceRows: ReportPerformanceRow[];
  availableClients: string[];
  availableCarriers: Array<{
    id: string;
    name: string;
  }>;
};

type AggregationRow = {
  containers: Container[];
  clientName: string;
  count: number;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function getPeriodThreshold(currentTime: string, period: ReportPeriod) {
  if (period === "ALL") {
    return null;
  }

  const date = new Date(currentTime);
  if (period === "LAST_7_DAYS") {
    date.setDate(date.getDate() - 7);
  } else if (period === "LAST_30_DAYS") {
    date.setDate(date.getDate() - 30);
  } else {
    date.setDate(date.getDate() - 90);
  }

  return date.toISOString();
}

function toMinutesDelta(reference: string, target: string) {
  return Math.round(
    (new Date(target).getTime() - new Date(reference).getTime()) / 60_000,
  );
}

function formatMinutes(minutes: number) {
  if (minutes < 0) {
    return `${Math.abs(minutes)} min`;
  }

  if (minutes === 0) {
    return "Em horario";
  }

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return hours > 0 ? `${hours}h ${remaining}m` : `${remaining}m`;
}

function resolveSlaLabel(currentTime: string, dueAt?: string | null) {
  if (!dueAt) {
    return { label: "Sem SLA", state: "NO_SLA" as const };
  }

  const minutes = toMinutesDelta(currentTime, dueAt);
  if (minutes < 0) {
    return { label: `Atrasado em ${formatMinutes(Math.abs(minutes))}`, state: "OVERDUE" as const };
  }

  if (minutes <= 120) {
    return { label: `Vence em ${formatMinutes(minutes)}`, state: "DUE_SOON" as const };
  }

  return { label: `Dentro do prazo (${formatMinutes(minutes)})`, state: "ON_TRACK" as const };
}

function buildSlaRows(
  occurrences: Awaited<ReturnType<typeof listOccurrences>>["data"],
  currentTime: string,
  filter: ReportSlaFilter,
  periodFrom: string | null,
) {
  return occurrences
    .filter((occurrence) => {
      if (periodFrom && new Date(occurrence.createdAt).toISOString() < periodFrom) {
        return false;
      }

      const slaState =
        occurrence.slaDeadlineAt
          ? resolveSlaLabel(currentTime, occurrence.slaDeadlineAt).state
          : "NO_SLA";

      if (filter === "ALL") {
        return true;
      }

      if (filter === "OVERDUE") {
        return slaState === "OVERDUE";
      }

      if (filter === "DUE_SOON") {
        return slaState === "DUE_SOON";
      }

      if (filter === "OPEN") {
        return occurrence.status === "OPEN" || occurrence.status === "IN_PROGRESS";
      }

      return occurrence.status === "RESOLVED";
    })
    .map<ReportSlaRow>((occurrence) => {
      const { label, state } = resolveSlaLabel(
        currentTime,
        occurrence.slaDeadlineAt,
      );
      return {
        id: occurrence.id,
        title: occurrence.title,
        containerCode: occurrence.container?.containerCode ?? "Sem vinculo",
        clientName: occurrence.container?.clientName ?? "Sem cliente",
        carrierName: occurrence.sourceLabel ?? "-",
        category: occurrence.category,
        severity: occurrence.severity,
        status: occurrence.status,
        dueAt: occurrence.slaDeadlineAt ? formatDateTime(occurrence.slaDeadlineAt) : "Sem vencimento",
        createdAt: formatDateTime(occurrence.createdAt),
        updatedAt: formatDateTime(occurrence.updatedAt),
        slaStatus: state,
        slaDeltaLabel: label,
        ownerName: occurrence.ownerName ?? "Nao atribuido",
      };
    })
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 120);
}

function buildPerformanceRows(
  containers: Container[],
  occurrencesByContainer: Map<string, number>,
  slaImpactByContainer: Map<string, "OVERDUE" | "DUE_SOON" | "OPEN" | "RESOLVED" | "NONE">,
  carriersById: Map<string, Carrier>,
) {
  return containers
    .map<ReportPerformanceRow>((container) => {
      const due = slaImpactByContainer.get(container.id) ?? "NONE";
      let riskScore = 0;

      if (container.status === "ATRASADO") {
        riskScore += 2;
      }

      const overdueDocs = (container.documentWorkflow?.blockedStages.length ?? 0) > 0 ? 1 : 0;
      riskScore += overdueDocs * 2;

      if (due === "OVERDUE") {
        riskScore += 2;
      } else if (due === "DUE_SOON") {
        riskScore += 1;
      } else if (due === "OPEN") {
        riskScore += 0.75;
      }

      const deliveryHours =
        container.portEntryAt && container.deliveredAt
          ? round2(
              (new Date(container.deliveredAt).getTime() -
                new Date(container.portEntryAt).getTime()) /
                3_600_000,
            ).toString()
          : "-";

      riskScore += Math.min(occurrencesByContainer.get(container.id) ?? 0, 2);

      return {
        containerId: container.id,
        containerCode: container.containerCode,
        clientName: container.clientName,
        carrierName: container.carrier?.name ?? carriersById.get(container.carrierId ?? "")?.name ?? "Sem transportadora",
        status: container.status,
        updatedAt: formatDateTime(container.updatedAt),
        deliveryHours,
        riskScore: Number(riskScore.toFixed(1)),
        slaImpact: due,
        docsBlocked: overdueDocs,
      };
    })
    .sort((left, right) => right.riskScore - left.riskScore || left.containerCode.localeCompare(right.containerCode))
    .slice(0, 14);
}

function aggregateByClient(
  containers: Container[],
  occurrencesByContainer: Map<string, ReportSlaRow[]>,
) {
  const map = new Map<string, AggregationRow & {
    inTransit: number;
    delayed: number;
    delivered: number;
    docs: number;
    avgDeliverySum: number;
    avgDeliveryCount: number;
  }>();

  for (const container of containers) {
    const row = map.get(container.clientName) ?? {
      containers: [],
      clientName: container.clientName,
      count: 0,
      inTransit: 0,
      delayed: 0,
      delivered: 0,
      docs: 0,
      avgDeliverySum: 0,
      avgDeliveryCount: 0,
    };

    row.count += 1;
    row.containers.push(container);

    if (container.status === "EM_TRANSPORTE" || container.status === "LIBERADO") {
      row.inTransit += 1;
    }

    if (container.status === "ATRASADO") {
      row.delayed += 1;
    }

    if (container.status === "ENTREGUE") {
      row.delivered += 1;
    }

    if ((container.documentWorkflow?.blockedStages.length ?? 0) > 0) {
      row.docs += 1;
    }

    if (container.portEntryAt && container.deliveredAt) {
      row.avgDeliverySum +=
        (new Date(container.deliveredAt).getTime() - new Date(container.portEntryAt).getTime()) /
        3_600_000;
      row.avgDeliveryCount += 1;
    }

    map.set(container.clientName, row);
  }

  return Array.from(map.values()).map<ReportClientRow>((row) => {
    const occurrences = row.containers.flatMap(
      (container) => occurrencesByContainer.get(container.id) ?? [],
    );
    const onTimeCount = row.containers.filter(
      (container) =>
        container.status === "ENTREGUE" &&
        container.portEntryAt &&
        container.deliveredAt &&
        toMinutesDelta(container.portEntryAt, container.deliveredAt) / 60 <= 96,
    ).length;

    return {
      clientName: row.clientName,
      totalContainers: row.count,
      inTransit: row.inTransit,
      delayed: row.delayed,
      delivered: row.delivered,
      avgDeliveryHours: row.avgDeliveryCount > 0
        ? round2(row.avgDeliverySum / row.avgDeliveryCount)
        : 0,
      onTimeRate: row.count > 0 ? round2((onTimeCount / row.count) * 100) : 0,
      pendingDocuments: row.docs,
      openOccurrences: occurrences.filter((item) => item.status === "OPEN").length,
      overdueOccurrences: occurrences.filter((item) => item.slaStatus === "OVERDUE").length,
    };
  });
}

function aggregateByCarrier(
  containers: Container[],
  carriersById: Map<string, Carrier>,
  occurrencesByContainer: Map<string, ReportSlaRow[]>,
) {
  const map = new Map<
    string,
    AggregationRow & {
      inTransit: number;
      delayed: number;
      delivered: number;
      docs: number;
      avgDeliverySum: number;
      avgDeliveryCount: number;
    }
  >();

  for (const container of containers) {
    const carrier = carriersById.get(container.carrierId ?? "") ??
      ({ id: "unlinked", name: "Sem transportadora", cnpj: "", driverName: "", truckPlate: "", phone: "", email: "", status: "INATIVA", createdAt: "", updatedAt: "" } as Carrier);
    const key = carrier.id;
    const row = map.get(key) ?? {
      containers: [],
      clientName: carrier.name,
      count: 0,
      inTransit: 0,
      delayed: 0,
      delivered: 0,
      docs: 0,
      avgDeliverySum: 0,
      avgDeliveryCount: 0,
    };

    row.count += 1;
    row.containers.push(container);

    if (container.status === "EM_TRANSPORTE" || container.status === "LIBERADO") {
      row.inTransit += 1;
    }

    if (container.status === "ATRASADO") {
      row.delayed += 1;
    }

    if (container.status === "ENTREGUE") {
      row.delivered += 1;
    }

    if ((container.documentWorkflow?.blockedStages.length ?? 0) > 0) {
      row.docs += 1;
    }

    if (container.portEntryAt && container.deliveredAt) {
      row.avgDeliverySum +=
        (new Date(container.deliveredAt).getTime() - new Date(container.portEntryAt).getTime()) /
        3_600_000;
      row.avgDeliveryCount += 1;
    }

    map.set(key, row);
  }

  return Array.from(map.values()).map<ReportCarrierRow>((row) => {
    const firstCarrier = row.containers[0]?.carrier ?? null;
    const sampleCarrier =
      firstCarrier ??
      carriersById.get(row.containers[0]?.carrierId ?? "") ??
      ({ id: "unlinked", name: "Sem transportadora", truckPlate: "-" } as Carrier);
    const occurrences = row.containers.flatMap(
      (container) => occurrencesByContainer.get(container.id) ?? [],
    );
    const onTimeCount = row.containers.filter(
      (container) =>
        container.status === "ENTREGUE" &&
        container.portEntryAt &&
        container.deliveredAt &&
        toMinutesDelta(container.portEntryAt, container.deliveredAt) / 60 <= 96,
    ).length;

    return {
      carrierId: sampleCarrier.id,
      carrierName: sampleCarrier.name,
      truckPlate: sampleCarrier.truckPlate,
      totalContainers: row.count,
      inTransit: row.inTransit,
      delayed: row.delayed,
      delivered: row.delivered,
      avgDeliveryHours: row.avgDeliveryCount > 0
        ? round2(row.avgDeliverySum / row.avgDeliveryCount)
        : 0,
      onTimeRate: row.count > 0 ? round2((onTimeCount / row.count) * 100) : 0,
      pendingDocuments: row.docs,
      openOccurrences: occurrences.filter((item) => item.status === "OPEN").length,
    };
  });
}

function buildKpis(
  containers: Container[],
  slaRows: ReportSlaRow[],
) {
  const deliveredRows = containers.filter((container) => container.status === "ENTREGUE");
  const inTransitRows = containers.filter((container) => container.status === "EM_TRANSPORTE");
  const delayedRows = containers.filter((container) => container.status === "ATRASADO");
  const docsPendingRows = containers.filter(
    (container) => (container.documentWorkflow?.blockedStages.length ?? 0) > 0,
  );
  const activeOccurrences = slaRows.filter((item) => item.status === "OPEN" || item.status === "IN_PROGRESS")
    .length;
  const resolvedOccurrences = slaRows.filter((item) => item.status === "RESOLVED").length;
  const overdueSla = slaRows.filter((item) => item.slaStatus === "OVERDUE").length;
  const dueSoonSla = slaRows.filter((item) => item.slaStatus === "DUE_SOON").length;
  const avgDeliveryHours =
    deliveredRows.length > 0
      ? round2(
          deliveredRows.reduce((total, container) => {
            if (!container.portEntryAt || !container.deliveredAt) {
              return total;
            }

            return total + (toMinutesDelta(container.portEntryAt, container.deliveredAt) / 60);
          }, 0) / deliveredRows.length,
        )
      : 0;
  const onTimeDeliveryRate = deliveredRows.length > 0
    ? round2(
        (deliveredRows.filter(
          (container) =>
            container.portEntryAt &&
            container.deliveredAt &&
            toMinutesDelta(container.portEntryAt, container.deliveredAt) / 60 <= 96,
        ).length /
          deliveredRows.length) *
          100,
      )
    : 0;

  return {
    totalContainers: containers.length,
    containersInTransit: inTransitRows.length,
    containersDelivered: deliveredRows.length,
    containersDelayed: delayedRows.length,
    containersWithDocHold: docsPendingRows.length,
    activeOccurrences,
    resolvedOccurrences,
    overdueSla,
    dueSoonSla,
    averageDeliveryHours: avgDeliveryHours,
    onTimeDeliveryRate,
  };
}

function buildCsvValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  const escaped = String(value).replace(/"/g, '""');
  return `"${escaped}"`;
}

function buildCsv(header: string[], rows: string[][]) {
  const head = header.join(",");
  const body = rows.map((row) => row.map(buildCsvValue).join(","));
  return [head, ...body].join("\r\n");
}

export function buildClientPerformanceCsv(snapshot: ReportSnapshot) {
  return buildCsv(
    [
      "Cliente",
      "Total",
      "Em transporte",
      "Atrasadas",
      "Entregues",
      "Tempo medio entrega (h)",
      "On time %",
      "Pendencias doc",
      "Ocorrencias abertas",
      "Ocorrencias vencidas",
    ],
    snapshot.clients.map((row) => [
      row.clientName,
      row.totalContainers,
      row.inTransit,
      row.delayed,
      row.delivered,
      row.avgDeliveryHours,
      `${row.onTimeRate}%`,
      row.pendingDocuments,
      row.openOccurrences,
      row.overdueOccurrences,
    ].map((item) => String(item)))
  );
}

export function buildCarrierPerformanceCsv(snapshot: ReportSnapshot) {
  return buildCsv(
    [
      "Transportadora",
      "Placa",
      "Total",
      "Em transporte",
      "Atrasadas",
      "Entregues",
      "Tempo medio entrega (h)",
      "On time %",
      "Pendencias doc",
      "Ocorrencias abertas",
    ],
    snapshot.carriers.map((row) => [
      row.carrierName,
      row.truckPlate,
      row.totalContainers,
      row.inTransit,
      row.delayed,
      row.delivered,
      row.avgDeliveryHours,
      `${row.onTimeRate}%`,
      row.pendingDocuments,
      row.openOccurrences,
    ].map((item) => String(item)))
  );
}

export function buildSlaReportCsv(snapshot: ReportSnapshot) {
  return buildCsv(
    [
      "Ocorrencia",
      "Cliente",
      "Transportadora/Origem",
      "Container",
      "Categoria",
      "Severidade",
      "Status",
      "SLA estado",
      "Tempo SLA",
      "Vencimento",
      "Criada",
      "Atualizada",
      "Responsavel",
    ],
    snapshot.slaRows.map((row) => [
      row.title,
      row.clientName,
      row.carrierName,
      row.containerCode,
      row.category,
      row.severity,
      row.status,
      row.slaStatus,
      row.slaDeltaLabel,
      row.dueAt,
      row.createdAt,
      row.updatedAt,
      row.ownerName,
    ].map((item) => String(item)))
  );
}

export function buildPerformanceCsv(snapshot: ReportSnapshot) {
  return buildCsv(
    [
      "Container",
      "Cliente",
      "Transportadora",
      "Status",
      "Atualizado",
      "Horas entrega",
      "Score risco",
      "Impacto SLA",
      "Docs bloqueados",
    ],
    snapshot.performanceRows.map((row) => [
      row.containerCode,
      row.clientName,
      row.carrierName,
      row.status,
      row.updatedAt,
      row.deliveryHours,
      row.riskScore,
      row.slaImpact,
      row.docsBlocked,
    ].map((item) => String(item)))
  );
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildTable(rows: Array<Record<string, string | number>>, headers: Array<{ key: string; label: string }>) {
  return `
    <table border="1" cellspacing="0" cellpadding="6" style="width:100%; border-collapse: collapse; margin-bottom:24px;">
      <thead>
        <tr>${headers
          .map((header) => `<th style="text-align:left; background:#f0f5f7;">${escapeHtml(header.label)}</th>`)
          .join("")}</tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) =>
              `<tr>${headers
                .map((header) => `<td>${escapeHtml(row[header.key])}</td>`)
                .join("")}</tr>`,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function numberToLabel(value: number) {
  return value.toLocaleString("pt-BR");
}

export function buildReportPdf(snapshot: ReportSnapshot, scope: ReportExportScope) {
  const clientRows = snapshot.clients.map((item) => ({
    ...item,
    onTimeRate: `${item.onTimeRate}%`,
    avgDeliveryHours: String(item.avgDeliveryHours),
    totalContainers: numberToLabel(item.totalContainers),
  }));

  const carrierRows = snapshot.carriers.map((item) => ({
    ...item,
    onTimeRate: `${item.onTimeRate}%`,
    avgDeliveryHours: String(item.avgDeliveryHours),
    totalContainers: numberToLabel(item.totalContainers),
  }));

  const slaRows = snapshot.slaRows.map((item) => ({
    ...item,
    dueAt: item.dueAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));

  const performanceRows = snapshot.performanceRows.map((item) => ({
    ...item,
    deliveryHours: item.deliveryHours,
    riskScore: String(item.riskScore),
  }));

  const data =
    scope === "CLIENT"
      ? buildTable(clientRows, [
          { key: "clientName", label: "Cliente" },
          { key: "totalContainers", label: "Total" },
          { key: "inTransit", label: "Em transporte" },
          { key: "delayed", label: "Atrasadas" },
          { key: "delivered", label: "Entregues" },
          { key: "avgDeliveryHours", label: "Tempo medio entrega (h)" },
          { key: "onTimeRate", label: "On time %" },
          { key: "pendingDocuments", label: "Docs bloqueados" },
          { key: "openOccurrences", label: "Ocorrencias abertas" },
          { key: "overdueOccurrences", label: "Ocorrencias vencidas" },
        ])
      : scope === "CARRIER"
        ? buildTable(carrierRows, [
            { key: "carrierName", label: "Transportadora" },
            { key: "truckPlate", label: "Placa" },
            { key: "totalContainers", label: "Total" },
            { key: "inTransit", label: "Em transporte" },
            { key: "delayed", label: "Atrasadas" },
            { key: "delivered", label: "Entregues" },
            { key: "avgDeliveryHours", label: "Tempo medio entrega (h)" },
            { key: "onTimeRate", label: "On time %" },
            { key: "pendingDocuments", label: "Docs bloqueados" },
            { key: "openOccurrences", label: "Ocorrencias abertas" },
          ])
        : scope === "SLA"
          ? buildTable(slaRows, [
              { key: "title", label: "Ocorrencia" },
              { key: "clientName", label: "Cliente" },
              { key: "carrierName", label: "Origem / transportadora" },
              { key: "containerCode", label: "Container" },
              { key: "category", label: "Categoria" },
              { key: "severity", label: "Severidade" },
              { key: "status", label: "Status" },
              { key: "slaStatus", label: "SLA" },
              { key: "slaDeltaLabel", label: "Tempo SLA" },
              { key: "dueAt", label: "Vencimento" },
              { key: "createdAt", label: "Criada" },
              { key: "updatedAt", label: "Atualizada" },
              { key: "ownerName", label: "Responsavel" },
            ])
          : buildTable(performanceRows, [
              { key: "containerCode", label: "Container" },
              { key: "clientName", label: "Cliente" },
              { key: "carrierName", label: "Transportadora" },
              { key: "status", label: "Status" },
              { key: "updatedAt", label: "Atualizado" },
              { key: "deliveryHours", label: "Horas entrega" },
              { key: "riskScore", label: "Score risco" },
              { key: "slaImpact", label: "Impacto SLA" },
              { key: "docsBlocked", label: "Docs bloqueados" },
            ]);

  return `
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Relatorio PortFlow</title>
      </head>
      <body style="font-family: Arial, sans-serif; color:#0f172a; padding:24px;">
        <h1>Relatorio Executivo - PortFlow</h1>
        <p><strong>Gerado em:</strong> ${snapshot.generatedAt}</p>
        <p><strong>Janela:</strong> ${snapshot.periodLabel}</p>
        <h2>Indicadores</h2>
        <ul>
          <li>Total de conteineres: ${numberToLabel(snapshot.kpis.totalContainers)}</li>
          <li>Em transporte: ${numberToLabel(snapshot.kpis.containersInTransit)}</li>
          <li>Entregues: ${numberToLabel(snapshot.kpis.containersDelivered)}</li>
          <li>Atrasados: ${numberToLabel(snapshot.kpis.containersDelayed)}</li>
          <li>Doc bloqueados: ${numberToLabel(snapshot.kpis.containersWithDocHold)}</li>
          <li>Ocorrencias ativas: ${numberToLabel(snapshot.kpis.activeOccurrences)}</li>
          <li>Ocorrencias vencidas: ${numberToLabel(snapshot.kpis.overdueSla)}</li>
          <li>Tempo medio entrega: ${snapshot.kpis.averageDeliveryHours}h</li>
          <li>Taxa entrega no prazo: ${snapshot.kpis.onTimeDeliveryRate}%</li>
        </ul>
        ${data}
      </body>
    </html>
  `;
}

export async function getReportSnapshot(filters: ReportFilters): Promise<ReportSnapshot> {
  const [containersResponse, occurrencesResponse, carriersResponse, runtime] = await Promise.all([
    listContainers({ page: 1, pageSize: 300 }),
    listOccurrences({ page: 1, pageSize: 500 }),
    listCarriers({ page: 1, pageSize: 200 }),
    getSimulationRuntime(),
  ]);

  const periodFrom = getPeriodThreshold(runtime.currentTime, filters.period);
  const baseContainers = containersResponse.data.filter((container) => {
    if (!periodFrom) {
      return true;
    }

    return new Date(container.updatedAt).toISOString() >= periodFrom;
  });

  const carriersById = new Map<string, Carrier>();
  for (const carrier of carriersResponse.data) {
    carriersById.set(carrier.id, carrier);
  }

  const slaRows = buildSlaRows(
    occurrencesResponse.data,
    runtime.currentTime,
    filters.slaFilter,
    periodFrom,
  );

  const filteredBySlaContainerIds = new Set(
    slaRows
      .map((item) =>
        occurrencesResponse.data.find((occurrence) => occurrence.id === item.id)?.container?.id,
      )
      .filter((value): value is string => Boolean(value)),
  );

  const filteredContainers = baseContainers.filter((container) => {
    if (
      filters.clientName &&
      !container.clientName.toLowerCase().includes(filters.clientName.toLowerCase())
    ) {
      return false;
    }

    if (filters.carrierId && container.carrierId !== filters.carrierId) {
      return false;
    }

    if (filters.slaFilter !== "ALL" && !filteredBySlaContainerIds.has(container.id)) {
      return false;
    }

    return true;
  });

  const occurrencesByContainer = new Map<string, ReportSlaRow[]>();
  for (const occurrence of slaRows) {
    const containerId = occurrencesResponse.data.find((item) => item.id === occurrence.id)?.container?.id;
    if (!containerId) {
      continue;
    }
    const current = occurrencesByContainer.get(containerId) ?? [];
    current.push(occurrence);
    occurrencesByContainer.set(containerId, current);
  }

  const slaImpactByContainer = new Map<
    string,
    "OVERDUE" | "DUE_SOON" | "OPEN" | "RESOLVED" | "NONE"
  >();
  for (const container of filteredContainers) {
    const linked = occurrencesResponse.data.filter(
      (item) => item.container?.id === container.id,
    );
    const hasOpen = linked.some((item) => item.status === "OPEN" || item.status === "IN_PROGRESS");
    const hasResolved = linked.some((item) => item.status === "RESOLVED");
    const hasOverdue = linked.some(
      (item) =>
        item.slaDeadlineAt &&
        new Date(item.slaDeadlineAt).toISOString() < runtime.currentTime &&
        (item.status === "OPEN" || item.status === "IN_PROGRESS"),
    );
    const dueSoon = linked.some(
      (item) =>
        item.slaDeadlineAt &&
        new Date(item.slaDeadlineAt).toISOString() >= runtime.currentTime &&
        Math.round(
          (new Date(item.slaDeadlineAt).getTime() - new Date(runtime.currentTime).getTime()) /
            60_000,
        ) <= 120,
    );

    let impact: ReportPerformanceRow["slaImpact"] = "NONE";
    if (hasOverdue) {
      impact = "OVERDUE";
    } else if (dueSoon) {
      impact = "DUE_SOON";
    } else if (hasOpen) {
      impact = "OPEN";
    } else if (hasResolved) {
      impact = "RESOLVED";
    }

    slaImpactByContainer.set(container.id, impact);
  }

  const clientPerf = aggregateByClient(filteredContainers, occurrencesByContainer)
    .sort((a, b) => b.totalContainers - a.totalContainers)
    .slice(0, 40);

  const carrierPerf = aggregateByCarrier(filteredContainers, carriersById, occurrencesByContainer)
    .sort((a, b) => b.totalContainers - a.totalContainers)
    .slice(0, 40);

  const performanceRows = buildPerformanceRows(
    filteredContainers,
    new Map(Array.from(occurrencesByContainer.entries()).map(([key, value]) => [
      key,
      value.length,
    ])),
    slaImpactByContainer,
    carriersById,
  );

  return {
    filters,
    generatedAt: runtime.currentTime,
    periodLabel: periodFrom
      ? `A partir de ${formatDateTime(periodFrom)}`
      : "Historico completo",
    kpis: buildKpis(filteredContainers, slaRows),
    clients: clientPerf,
    carriers: carrierPerf,
    slaRows: slaRows.slice(0, 120),
    performanceRows,
    availableClients: [...new Set(containersResponse.data.map((container) => container.clientName))]
      .sort((left, right) => left.localeCompare(right))
      .slice(0, 20),
    availableCarriers: carriersResponse.data.map((carrier) => ({
      id: carrier.id,
      name: carrier.name,
    })),
  };
}
