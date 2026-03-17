"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Clock3,
  Container,
  Ship,
  ShieldCheck,
  Truck,
  Warehouse,
} from "lucide-react";
import { OccurrenceSeverityBadge, OccurrenceStatusBadge } from "@/components/app/occurrence-badges";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatDateTime,
  formatOccurrenceCategory,
  formatWeight,
} from "@/lib/formatters";
import { getDashboardOverview } from "@/services/dashboard-service";

const pieColors = ["#0b4f6c", "#ee6c4d", "#2d6a4f", "#f4a261", "#8d99ae"];

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: getDashboardOverview,
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Operacao integrada"
        title="Dashboard logistico"
        description="Indicadores do patio, transporte rodoviario, entregas e ocorrencias consolidados para tomada de decisao operacional."
      />

      {isLoading || !data ? (
        <Card>
          <CardContent className="p-10 text-sm text-muted-foreground">
            Carregando visao consolidada da operacao...
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Conteineres no porto"
              value={String(data.kpis.containersInPort)}
              helper="Unidades aguardando inspecao, liberacao ou expedicao"
              icon={Warehouse}
            />
            <StatCard
              title="Em transporte"
              value={String(data.kpis.containersInTransport)}
              helper="Cargas liberadas seguindo para entrega final"
              icon={Truck}
            />
            <StatCard
              title="Entregues"
              value={String(data.kpis.containersDelivered)}
              helper="Entregas confirmadas e encerradas operacionalmente"
              icon={ShieldCheck}
            />
            <StatCard
              title="Em fiscalizacao"
              value={String(data.kpis.awaitingClearance)}
              helper="Processos aduaneiros ainda em andamento"
              icon={Container}
            />
            <StatCard
              title="Navios previstos"
              value={String(data.kpis.expectedShips)}
              helper="Escalas futuras em janela operacional proxima"
              icon={Ship}
            />
            <StatCard
              title="Tempo medio de entrega"
              value={`${data.kpis.averageDeliveryTimeHours}h`}
              helper="Da entrada no porto ate a confirmacao de recebimento"
              icon={Clock3}
            />
            <StatCard
              title="Ocorrencias abertas"
              value={String(data.kpis.openOccurrences)}
              helper="Incidentes operacionais exigindo tratamento"
              icon={AlertTriangle}
            />
            <StatCard
              title="Ocorrencias criticas"
              value={String(data.kpis.criticalOccurrences)}
              helper="Itens de alto impacto com SLA reduzido"
              icon={AlertTriangle}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Movimentacao por dia</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.movementByDay}>
                    <defs>
                      <linearGradient id="movement" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#0b4f6c" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#0b4f6c" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dbe5ea" />
                    <XAxis dataKey="day" stroke="#52606d" />
                    <YAxis stroke="#52606d" />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="totalMovements"
                      stroke="#0b4f6c"
                      fill="url(#movement)"
                      strokeWidth={3}
                    />
                    <Area
                      type="monotone"
                      dataKey="deliveries"
                      stroke="#ee6c4d"
                      fill="transparent"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribuicao por status</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.statusDistribution}
                      dataKey="total"
                      nameKey="status"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                    >
                      {data.statusDistribution.map((entry, index) => (
                        <Cell
                          key={entry.status}
                          fill={pieColors[index % pieColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Card>
              <CardHeader>
                <CardTitle>Volume por cliente</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.volumeByClient.slice(0, 6)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dbe5ea" />
                    <XAxis dataKey="client" stroke="#52606d" />
                    <YAxis stroke="#52606d" />
                    <Tooltip />
                    <Bar dataKey="totalContainers" fill="#0b4f6c" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="totalWeight" fill="#ee6c4d" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Proximas escalas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.upcomingShips.map((shipItem) => (
                  <div
                    key={shipItem.id}
                    className="rounded-2xl border border-border/80 bg-white/70 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{shipItem.name}</p>
                        <p className="text-sm text-muted-foreground">{shipItem.company}</p>
                      </div>
                      <StatusBadge value={shipItem.status} />
                    </div>
                    <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                      <span>ETA: {formatDateTime(shipItem.eta)}</span>
                      <span>
                        {shipItem.origin} -&gt; {shipItem.destination}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Alertas operacionais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.delayedContainers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-secondary/40 px-4 py-5 text-sm text-muted-foreground">
                    Nenhum atraso critico registrado.
                  </div>
                ) : null}
                {data.delayedContainers.map((containerItem) => (
                  <div
                    key={containerItem.id}
                    className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{containerItem.containerCode}</p>
                        <p className="text-sm text-muted-foreground">
                          {containerItem.clientName} · {containerItem.origin} -&gt; {containerItem.destination}
                        </p>
                      </div>
                      <StatusBadge value={containerItem.status} />
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      ETA {formatDateTime(containerItem.eta)} · {formatWeight(containerItem.weight)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ocorrencias recentes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.recentOccurrences.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-secondary/40 px-4 py-5 text-sm text-muted-foreground">
                    Nenhuma ocorrencia aberta no momento.
                  </div>
                ) : null}
                {data.recentOccurrences.map((occurrence) => (
                  <div
                    key={occurrence.id}
                    className="rounded-2xl border border-border/80 bg-white/70 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{occurrence.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {occurrence.sourceLabel} · {occurrence.description}
                        </p>
                      </div>
                      <OccurrenceSeverityBadge value={occurrence.severity} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>{formatOccurrenceCategory(occurrence.category)}</span>
                      <span>SLA {formatDateTime(occurrence.slaDeadlineAt)}</span>
                    </div>
                    <div className="mt-3">
                      <OccurrenceStatusBadge value={occurrence.status} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
            <Card>
              <CardHeader>
                <CardTitle>Ocorrencias por severidade</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.occurrenceBySeverity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dbe5ea" />
                    <XAxis dataKey="severity" stroke="#52606d" />
                    <YAxis stroke="#52606d" />
                    <Tooltip />
                    <Bar dataKey="total" fill="#ee6c4d" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Eventos recentes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.recentEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-border/80 bg-white/70 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{event.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {event.container?.containerCode} · {event.description}
                        </p>
                      </div>
                      <StatusBadge value={event.type} />
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {formatDateTime(event.occurredAt)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
