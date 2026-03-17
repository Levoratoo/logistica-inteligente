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
  Clock3,
  Container,
  Ship,
  Truck,
  Warehouse,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatWeight } from "@/lib/formatters";
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
        eyebrow="Operação integrada"
        title="Dashboard logístico"
        description="Indicadores do pátio, transporte rodoviário e fluxo de entrega consolidados para tomada de decisão operacional."
      />

      {isLoading || !data ? (
        <Card>
          <CardContent className="p-10 text-sm text-muted-foreground">
            Carregando visão consolidada da operação...
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <StatCard
              title="Contêineres no porto"
              value={String(data.kpis.containersInPort)}
              helper="Unidades aguardando inspeção, liberação ou expedição"
              icon={Warehouse}
            />
            <StatCard
              title="Em transporte"
              value={String(data.kpis.containersInTransport)}
              helper="Cargas já liberadas seguindo para entrega final"
              icon={Truck}
            />
            <StatCard
              title="Entregues"
              value={String(data.kpis.containersDelivered)}
              helper="Entregas confirmadas e encerradas operacionalmente"
              icon={ShieldCheck}
            />
            <StatCard
              title="Em fiscalização"
              value={String(data.kpis.awaitingClearance)}
              helper="Processos alfandegários ainda em andamento"
              icon={Container}
            />
            <StatCard
              title="Navios previstos"
              value={String(data.kpis.expectedShips)}
              helper="Escalas futuras em janela operacional próxima"
              icon={Ship}
            />
            <StatCard
              title="Tempo médio de entrega"
              value={`${data.kpis.averageDeliveryTimeHours}h`}
              helper="Da entrada em porto até confirmação de recebimento"
              icon={Clock3}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Movimentação por dia</CardTitle>
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
                <CardTitle>Distribuição por status</CardTitle>
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

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
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
                <CardTitle>Próximas escalas</CardTitle>
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
                        {shipItem.origin} → {shipItem.destination}
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
                    Nenhum atraso crítico registrado.
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
                          {containerItem.clientName} · {containerItem.origin} → {containerItem.destination}
                        </p>
                      </div>
                      <StatusBadge value={containerItem.status} />
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      ETA prevista em {formatDateTime(containerItem.eta)} · {formatWeight(containerItem.weight)}
                    </p>
                  </div>
                ))}
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
