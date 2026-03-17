"use client";

import { useState } from "react";
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
  buildCarrierFinanceCsv,
  buildCarrierPerformanceCsv,
  buildClientPerformanceCsv,
  buildContractFinanceCsv,
  buildPerformanceCsv,
  buildReportPdf,
  buildSlaReportCsv,
  getReportSnapshot,
  type ReportCarrierRow,
  type ReportExportScope,
  type ReportFilters,
  type ReportFinancialCarrierRow,
  type ReportFinancialContractRow,
  type ReportPerformanceRow,
  type ReportPeriod,
  type ReportSlaFilter,
  type ReportSlaRow,
} from "@/services/reports-service";
import type { Carrier } from "@/types/api";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  minimumFractionDigits: 2,
  style: "currency",
});

const scopeButtons: Array<{
  key: ReportExportScope;
  label: string;
  description: string;
}> = [
  { key: "CLIENT", label: "Por cliente", description: "Consolidado por cliente" },
  {
    key: "CARRIER",
    label: "Por transportadora",
    description: "Indicadores de desempenho por operador logistico",
  },
  {
    key: "SLA",
    label: "Por SLA",
    description: "Ocorrencias abertas, vencidas e vencendo em 2h",
  },
  {
    key: "FINANCE_CARRIER",
    label: "Financeiro por transportadora",
    description: "Custo de transporte, atraso e SLA por transportadora",
  },
  {
    key: "FINANCE_CONTRACT",
    label: "Financeiro por contrato",
    description: "Custo e SLA por contrato (cliente + transportadora)",
  },
  {
    key: "PERFORMANCE",
    label: "Performance operacional",
    description: "Risco e prioridade da carteira ativa",
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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [scope, setScope] = useState<ReportExportScope>("CLIENT");

  const reportQuery = useQuery({
    queryKey: [
      "reports-overview",
      { period, clientName, carrierId, slaFilter, dateFrom, dateTo },
    ],
    queryFn: () =>
      getReportSnapshot({
        period,
        clientName: clientName || undefined,
        carrierId: carrierId || undefined,
        slaFilter,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      } satisfies ReportFilters),
  });

  const data = reportQuery.data;
  const hasFinanceScope = scope === "FINANCE_CARRIER" || scope === "FINANCE_CONTRACT";

  const { clientOptions, carrierOptions } = (() => {
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
  })();

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
    } else if (scope === "FINANCE_CARRIER") {
      content = buildCarrierFinanceCsv(data);
      filename = `relatorio_financeiro_transportadora_${Date.now()}.csv`;
    } else if (scope === "FINANCE_CONTRACT") {
      content = buildContractFinanceCsv(data);
      filename = `relatorio_financeiro_contrato_${Date.now()}.csv`;
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
        description="Exportacao de dados por cliente, transportadora, SLA e desempenho financeiro para sustentacao de decisao."
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
        <CardContent className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-7">
          <Input
            placeholder="Filtrar cliente"
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
          />
          <Input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            placeholder="Data inicial"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            placeholder="Data final"
          />
          <Select value={carrierId} onChange={(event) => setCarrierId(event.target.value)}>
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
          <Button
            variant="outline"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
          >
            Limpar intervalo
          </Button>
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
            title="Total de containeres"
            value={String(data?.kpis.totalContainers ?? 0)}
            helper={data ? "No escopo de filtros atual" : "Carregando"}
            icon={Radar}
          />
          <StatCard
            title="Em transporte"
            value={String(data?.kpis.containersInTransit ?? 0)}
            helper="Lib. e em rota"
            icon={TrendingUp}
          />
          <StatCard
            title="Entregues"
            value={String(data?.kpis.containersDelivered ?? 0)}
            helper="Ciclos concluidos"
            icon={PlayCircle}
          />
          <StatCard
            title="Atrasados"
            value={String(data?.kpis.containersDelayed ?? 0)}
            helper="Acompanhar prioridade"
            icon={TimerReset}
          />
          <StatCard
            title="SLA vencidas"
            value={String(data?.kpis.overdueSla ?? 0)}
            helper="Ocorrencias fora do prazo"
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

      {hasFinanceScope ? (
        <Card>
          <CardContent className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-5">
            <StatCard
              title="Custo transporte"
              value={data ? currencyFormatter.format(data.financialKpis.totalTransportCost) : "R$ 0,00"}
              helper="Total no escopo atual"
              icon={TrendingUp}
            />
            <StatCard
              title="Custo por atraso"
              value={data ? currencyFormatter.format(data.financialKpis.totalDelayCost) : "R$ 0,00"}
              helper="Penalidades e desvios"
              icon={TimerReset}
            />
            <StatCard
              title="Custo total"
              value={data ? currencyFormatter.format(data.financialKpis.totalContractCost) : "R$ 0,00"}
              helper="Transporte + atraso"
              icon={Users2}
            />
            <StatCard
              title="Custo medio por container"
              value={data ? currencyFormatter.format(data.financialKpis.avgCostPerContainer) : "R$ 0,00"}
              helper="Indicador de eficiencia financeira"
              icon={FileText}
            />
            <StatCard
              title="SLA contrato medio"
              value={`${data?.financialKpis.averageContractSla ?? 0}%`}
              helper="SLA consolidado no escopo"
              icon={Radar}
            />
          </CardContent>
        </Card>
      ) : null}

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

              {scope === "CARRIER" ? <CarrierTable carriers={data.carriers} /> : null}
              {scope === "SLA" ? <SlaTable rows={data.slaRows} /> : null}
              {scope === "PERFORMANCE" ? <PerformanceTable rows={data.performanceRows} /> : null}
              {scope === "FINANCE_CARRIER" ? (
                <FinancialCarrierTable rows={data.financialCarrierRows} />
              ) : null}
              {scope === "FINANCE_CONTRACT" ? (
                <FinancialContractTable rows={data.financialContractRows} />
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReportTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
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

function FinancialCarrierTable({ rows }: { rows: ReportFinancialCarrierRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Transportadora</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Em transporte</TableHead>
          <TableHead>Atrasadas</TableHead>
          <TableHead>Entregues</TableHead>
          <TableHead>Custo transporte</TableHead>
          <TableHead>Custo atraso</TableHead>
          <TableHead>Custo total</TableHead>
          <TableHead>SLA contrato %</TableHead>
          <TableHead>Custo medio</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.carrierId}>
            <TableCell>{row.carrierName}</TableCell>
            <TableCell>{row.totalContainers}</TableCell>
            <TableCell>{row.inTransit}</TableCell>
            <TableCell>{row.delayed}</TableCell>
            <TableCell>{row.delivered}</TableCell>
            <TableCell>{currencyFormatter.format(row.transportCost)}</TableCell>
            <TableCell>{currencyFormatter.format(row.delayCost)}</TableCell>
            <TableCell>{currencyFormatter.format(row.totalCost)}</TableCell>
            <TableCell>{row.contractSlaRate}%</TableCell>
            <TableCell>{currencyFormatter.format(row.avgCostPerContainer)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function FinancialContractTable({ rows }: { rows: ReportFinancialContractRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Contrato</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Transportadora</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Entregues</TableHead>
          <TableHead>Atrasadas</TableHead>
          <TableHead>Custo transporte</TableHead>
          <TableHead>Custo atraso</TableHead>
          <TableHead>Custo total</TableHead>
          <TableHead>SLA %</TableHead>
          <TableHead>Ocorrencias abertas</TableHead>
          <TableHead>Ocorrencias vencidas</TableHead>
          <TableHead>Custo medio</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.contractId}>
            <TableCell>{row.contractId}</TableCell>
            <TableCell>{row.clientName}</TableCell>
            <TableCell>{row.carrierName}</TableCell>
            <TableCell>{row.totalContainers}</TableCell>
            <TableCell>{row.delivered}</TableCell>
            <TableCell>{row.delayed}</TableCell>
            <TableCell>{currencyFormatter.format(row.transportCost)}</TableCell>
            <TableCell>{currencyFormatter.format(row.delayCost)}</TableCell>
            <TableCell>{currencyFormatter.format(row.totalCost)}</TableCell>
            <TableCell>{row.slaRate}%</TableCell>
            <TableCell>{row.activeOccurrences}</TableCell>
            <TableCell>{row.overdueOccurrences}</TableCell>
            <TableCell>{currencyFormatter.format(row.avgCostPerContainer)}</TableCell>
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
          <TableHead>Container</TableHead>
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
