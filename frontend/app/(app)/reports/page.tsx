"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, PlayCircle, Radar, Search, TimerReset, TrendingUp, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/app/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/app/page-header";
import { formatDateTime } from "@/lib/formatters";
import {
  buildCarrierPerformanceCsv,
  buildClientPerformanceCsv,
  buildPerformanceCsv,
  buildReportPdf,
  buildSlaReportCsv,
  getReportSnapshot,
  type ReportCarrierRow,
  type ReportExportScope,
  type ReportFilters,
  type ReportPerformanceRow,
  type ReportPeriod,
  type ReportSlaFilter,
  type ReportSlaRow,
} from "@/services/reports-service";
import type { Carrier } from "@/types/api";

const scopeButtons: Array<{
  key: ReportExportScope;
  label: string;
  description: string;
}> = [
  { key: "CLIENT", label: "Por cliente", description: "Desempenho consolidado por empresa" },
  { key: "CARRIER", label: "Por transportadora", description: "Indicadores por operador logístico" },
  { key: "SLA", label: "Por SLA", description: "Visao de alertas críticos e pendentes" },
  {
    key: "PERFORMANCE",
    label: "Performance operacional",
    description: "Concentrado no risco do fluxo ativo",
  },
];

const periodOptions: Array<{ value: ReportPeriod; label: string }> = [
  { value: "ALL", label: "Historico completo" },
  { value: "LAST_7_DAYS", label: "Ultimos 7 dias" },
  { value: "LAST_30_DAYS", label: "Ultimos 30 dias" },
  { value: "LAST_90_DAYS", label: "Ultimos 90 dias" },
];

const slaOptions: Array<{ value: ReportSlaFilter; label: string }> = [
  { value: "ALL", label: "Todos os SLA" },
  { value: "OVERDUE", label: "SLA vencidas" },
  { value: "DUE_SOON", label: "SLA vencendo em ate 2h" },
  { value: "OPEN", label: "Ocorrencias abertas" },
  { value: "RESOLVED", label: "Ocorrencias resolvidas" },
];

export default function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>("ALL");
  const [clientName, setClientName] = useState("");
  const [carrierId, setCarrierId] = useState("");
  const [slaFilter, setSlaFilter] = useState<ReportSlaFilter>("ALL");
  const [scope, setScope] = useState<ReportExportScope>("CLIENT");

  const reportQuery = useQuery({
    queryKey: ["reports-overview", { period, clientName, carrierId, slaFilter }],
    queryFn: () =>
      getReportSnapshot({
        period,
        clientName: clientName || undefined,
        carrierId: carrierId || undefined,
        slaFilter,
      } satisfies ReportFilters),
  });

  const data = reportQuery.data;

  const { clientOptions, carrierOptions } = useMemo(() => {
    if (!data) {
      return {
        clientOptions: [] as string[],
        carrierOptions: [] as Array<Pick<Carrier, "id" | "name">>,
      };
    }

    return {
      clientOptions: data.availableClients,
      carrierOptions: data.availableCarriers,
    };
  }, [data]);

  function downloadCsv() {
    if (!data) {
      return;
    }

    let content = "";
    let filename = "";

    if (scope === "CLIENT") {
      content = buildClientPerformanceCsv(data);
      filename = `relatorio_clientes_${Date.now()}.csv`;
    } else if (scope === "CARRIER") {
      content = buildCarrierPerformanceCsv(data);
      filename = `relatorio_transportadoras_${Date.now()}.csv`;
    } else if (scope === "SLA") {
      content = buildSlaReportCsv(data);
      filename = `relatorio_sla_${Date.now()}.csv`;
    } else {
      content = buildPerformanceCsv(data);
      filename = `relatorio_performance_${Date.now()}.csv`;
    }

    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function exportPdf() {
    if (!data) {
      return;
    }

    const popup = window.open("", "_blank");
    if (!popup) {
      return;
    }

    popup.document.open();
    popup.document.write(buildReportPdf(data, scope));
    popup.document.close();
    popup.focus();
    popup.print();
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Inteligencia operacional"
        title="Centro de Relatorios Executivos"
        description="Exportacao de dados por cliente, transportadora, SLA e performance operacional para sustentacao de decisao e auditoria."
        actions={
          <div className="flex flex-wrap gap-3">
            <Button onClick={downloadCsv} disabled={reportQuery.isLoading || !data}>
              <Download className="size-4" />
              Exportar CSV
            </Button>
            <Button variant="outline" onClick={exportPdf} disabled={reportQuery.isLoading || !data}>
              <FileText className="size-4" />
              Exportar PDF
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-5">
          <Input
            placeholder="Filtrar cliente"
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
          />
          <Select
            value={carrierId}
            onChange={(event) => setCarrierId(event.target.value)}
          >
            <option value="">Todas as transportadoras</option>
            {carrierOptions.map((carrier) => (
              <option key={carrier.id} value={carrier.id}>
                {carrier.name}
              </option>
            ))}
          </Select>
          <Select
            value={slaFilter}
            onChange={(event) => setSlaFilter(event.target.value as ReportSlaFilter)}
          >
            {slaOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            value={period}
            onChange={(event) => setPeriod(event.target.value as ReportPeriod)}
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <div className="flex items-center rounded-2xl border border-border bg-white/70 px-3">
            <Search className="mr-2 size-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {clientOptions.length} clientes no escopo atual
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-6">
          <StatCard
            title="Total de contêineres"
            value={String(data?.kpis.totalContainers ?? 0)}
            helper={data ? "No escopo de filtros atual" : "Carregando"}
            icon={Radar}
          />
          <StatCard
            title="Em transporte"
            value={String(data?.kpis.containersInTransit ?? 0)}
            helper="Contêineres liberados e em rota"
            icon={TrendingUp}
          />
          <StatCard
            title="Entregues"
            value={String(data?.kpis.containersDelivered ?? 0)}
            helper="Últimos ciclos no escopo"
            icon={PlayCircle}
          />
          <StatCard
            title="Atrasados"
            value={String(data?.kpis.containersDelayed ?? 0)}
            helper="Itens com risco operacional"
            icon={TimerReset}
          />
          <StatCard
            title="SLA vencidas"
            value={String(data?.kpis.overdueSla ?? 0)}
            helper="Ocorrências fora do prazo"
            icon={FileText}
          />
          <StatCard
            title="Prazo alvo"
            value={`${data?.kpis.onTimeDeliveryRate ?? 0}%`}
            helper="Taxa de entrega no prazo"
            icon={Users2}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Visao consolidada</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                {data
                  ? `Gerado em ${formatDateTime(data.generatedAt)}  |  ${data.periodLabel}`
                  : "Aguarde o carregamento dos indicadores."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {scopeButtons.map((button) => (
                <Button
                  key={button.key}
                  size="sm"
                  variant={scope === button.key ? "default" : "outline"}
                  onClick={() => setScope(button.key)}
                >
                  {button.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            {scopeButtons.find((item) => item.key === scope)?.description}
          </p>

          {reportQuery.isLoading || !data ? (
            <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-8 text-sm text-muted-foreground">
              Carregando dados para a visao selecionada...
            </div>
          ) : (
            <>
              {scope === "CLIENT" ? (
                <ReportTable
                  headers={[
                    "Cliente",
                    "Total",
                    "Em transporte",
                    "Atrasadas",
                    "Entregues",
                    "Tempo entrega (h)",
                    "On time %",
                    "Docs bloqueadas",
                    "Ocorrencias abertas",
                    "Ocorrencias vencidas",
                  ]}
                  rows={data.clients.map((row) => [
                    row.clientName,
                    String(row.totalContainers),
                    String(row.inTransit),
                    String(row.delayed),
                    String(row.delivered),
                    String(row.avgDeliveryHours),
                    `${row.onTimeRate}%`,
                    String(row.pendingDocuments),
                    String(row.openOccurrences),
                    String(row.overdueOccurrences),
                  ])}
                />
              ) : null}

              {scope === "CARRIER" ? (
                <CarrierTable carriers={data.carriers} />
              ) : null}

              {scope === "SLA" ? <SlaTable rows={data.slaRows} /> : null}

              {scope === "PERFORMANCE" ? (
                <PerformanceTable rows={data.performanceRows} />
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReportTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {headers.map((header) => (
            <TableHead key={header}>{header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={`${row[0]}-${row[1]}`}>
            {row.map((cell) => (
              <TableCell key={cell}>{cell}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function CarrierTable({ carriers }: { carriers: ReportCarrierRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Transportadora</TableHead>
          <TableHead>Placa</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Em transporte</TableHead>
          <TableHead>Atrasadas</TableHead>
          <TableHead>Entregues</TableHead>
          <TableHead>Tempo medio entrega (h)</TableHead>
          <TableHead>On time %</TableHead>
          <TableHead>Docs bloqueadas</TableHead>
          <TableHead>Ocorrencias abertas</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {carriers.map((row) => (
          <TableRow key={row.carrierId}>
            <TableCell>{row.carrierName}</TableCell>
            <TableCell>{row.truckPlate}</TableCell>
            <TableCell>{row.totalContainers}</TableCell>
            <TableCell>{row.inTransit}</TableCell>
            <TableCell>{row.delayed}</TableCell>
            <TableCell>{row.delivered}</TableCell>
            <TableCell>{row.avgDeliveryHours}</TableCell>
            <TableCell>{row.onTimeRate}%</TableCell>
            <TableCell>{row.pendingDocuments}</TableCell>
            <TableCell>{row.openOccurrences}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function SlaTable({ rows }: { rows: ReportSlaRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Titulo</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Container</TableHead>
          <TableHead>Categoria</TableHead>
          <TableHead>Severidade</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>SLA</TableHead>
          <TableHead>Tempo SLA</TableHead>
          <TableHead>Vencimento</TableHead>
          <TableHead>Responsavel</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{row.title}</TableCell>
            <TableCell>{row.clientName}</TableCell>
            <TableCell>{row.containerCode}</TableCell>
            <TableCell>{row.category}</TableCell>
            <TableCell>{row.severity}</TableCell>
            <TableCell>{row.status}</TableCell>
            <TableCell>{row.slaStatus}</TableCell>
            <TableCell>{row.slaDeltaLabel}</TableCell>
            <TableCell>{row.dueAt}</TableCell>
            <TableCell>{row.ownerName}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function PerformanceTable({ rows }: { rows: ReportPerformanceRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Conteiner</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Transportadora</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Atualizado</TableHead>
          <TableHead>Horas para entrega</TableHead>
          <TableHead>Score de risco</TableHead>
          <TableHead>Impacto SLA</TableHead>
          <TableHead>Docs bloqueadas</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.containerId}>
            <TableCell>{row.containerCode}</TableCell>
            <TableCell>{row.clientName}</TableCell>
            <TableCell>{row.carrierName}</TableCell>
            <TableCell>{row.status}</TableCell>
            <TableCell>{row.updatedAt}</TableCell>
            <TableCell>{row.deliveryHours}</TableCell>
            <TableCell>{row.riskScore}</TableCell>
            <TableCell>{row.slaImpact}</TableCell>
            <TableCell>{row.docsBlocked}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
