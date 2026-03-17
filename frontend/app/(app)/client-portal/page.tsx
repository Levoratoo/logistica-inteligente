"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Clock3,
  Container,
  FileWarning,
  Radar,
  Truck,
} from "lucide-react";
import { useAuth } from "@/components/app/auth-provider";
import { OccurrenceSeverityBadge, OccurrenceStatusBadge } from "@/components/app/occurrence-badges";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/formatters";
import { getClientPortalOverview } from "@/services/client-portal-service";

export default function ClientPortalPage() {
  const { user } = useAuth();

  const portalQuery = useQuery({
    queryKey: ["client-portal-overview", user?.clientName],
    queryFn: () => getClientPortalOverview(user?.clientName ?? ""),
    enabled: Boolean(user?.clientName),
  });

  const data = portalQuery.data;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Portal do cliente"
        title={user?.clientName ? `Visao da conta ${user.clientName}` : "Portal externo"}
        description="Acompanhe suas cargas, documentos e marcos logísticos sem acessar a area operacional interna."
      />

      {portalQuery.isLoading || !data ? (
        <Card>
          <CardContent className="p-10 text-sm text-muted-foreground">
            Carregando cargas da sua conta...
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard
              title="Cargas ativas"
              value={String(data.kpis.activeContainers)}
              helper="Unidades ainda em fluxo operacional"
              icon={Container}
            />
            <StatCard
              title="Em transporte"
              value={String(data.kpis.inTransit)}
              helper="Entregas em rota para seu destino"
              icon={Truck}
            />
            <StatCard
              title="Entregues"
              value={String(data.kpis.delivered)}
              helper="Operacoes encerradas recentemente"
              icon={Radar}
            />
            <StatCard
              title="Pendencias"
              value={String(data.kpis.pendingDocuments)}
              helper="Cargas aguardando documentacao ou revisao"
              icon={FileWarning}
            />
            <StatCard
              title="Ocorrencias"
              value={String(data.kpis.openOccurrences)}
              helper="Alertas que impactam diretamente suas cargas"
              icon={AlertTriangle}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Card>
              <CardHeader>
                <CardTitle>Minhas cargas</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Visao resumida das unidades vinculadas a sua conta.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.shipments.map((shipment) => (
                  <div
                    key={shipment.id}
                    className="rounded-3xl border border-border/80 bg-white/75 p-5"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge value={shipment.status} />
                          {shipment.documentWorkflow?.blockedStages.length ? (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                              {shipment.documentWorkflow.blockedStages.length} bloqueio(s)
                            </span>
                          ) : null}
                        </div>
                        <div>
                          <p className="font-display text-xl font-semibold">
                            {shipment.containerCode}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {shipment.cargoDescription}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs font-medium text-muted-foreground">
                          <span>Origem: {shipment.origin}</span>
                          <span>Destino: {shipment.destination}</span>
                          <span>ETA: {formatDateTime(shipment.deliveredAt ?? shipment.eta)}</span>
                          <span>Navio: {shipment.ship?.name ?? "Sem vinculo"}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 xl:w-[220px]">
                        <Button asChild>
                          <Link href={`/container-details?id=${shipment.id}`}>
                            Abrir detalhe completo
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Alertas da conta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.openIssues.length === 0 ? (
                    <EmptyState label="Nenhuma ocorrencia aberta impactando suas cargas." />
                  ) : (
                    data.openIssues.map((issue) => (
                      <div
                        key={issue.id}
                        className="rounded-2xl border border-border/80 bg-secondary/35 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <OccurrenceSeverityBadge value={issue.severity} />
                          <OccurrenceStatusBadge value={issue.status} />
                        </div>
                        <p className="mt-3 font-semibold">{issue.title}</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {issue.description}
                        </p>
                        <p className="mt-3 text-xs font-medium text-muted-foreground">
                          Atualizado em {formatDateTime(issue.updatedAt)}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Documentos e proximos passos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.documentAlerts.length === 0 ? (
                    <EmptyState label="Nenhuma pendencia documental ativa neste momento." />
                  ) : (
                    data.documentAlerts.map((shipment) => (
                      <div
                        key={shipment.id}
                        className="rounded-2xl border border-border/80 bg-secondary/35 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold">{shipment.containerCode}</p>
                            <p className="text-sm text-muted-foreground">
                              {shipment.documentWorkflow?.blockingReason ?? "Checklist em revisao."}
                            </p>
                          </div>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/container-details?id=${shipment.id}`}>Ver detalhes</Link>
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Proximas entregas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.upcomingDeliveries.length === 0 ? (
                  <EmptyState label="Nenhuma entrega pendente na sua conta." />
                ) : (
                  data.upcomingDeliveries.map((shipment) => (
                    <div
                      key={shipment.id}
                      className="rounded-2xl border border-border/80 bg-white/80 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{shipment.containerCode}</p>
                          <p className="text-sm text-muted-foreground">
                            {shipment.destination}
                          </p>
                        </div>
                        <StatusBadge value={shipment.status} />
                      </div>
                      <p className="mt-3 text-xs font-medium text-muted-foreground">
                        ETA {formatDateTime(shipment.deliveredAt ?? shipment.eta)}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ultimas atualizacoes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.recentMilestones.length === 0 ? (
                  <EmptyState label="Ainda nao houve eventos recentes para esta conta." />
                ) : (
                  data.recentMilestones.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-2xl border border-border/80 bg-white/80 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{event.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {event.container?.containerCode ?? "Carga"} • {event.description}
                          </p>
                        </div>
                        <Clock3 className="size-4 text-primary" />
                      </div>
                      <p className="mt-3 text-xs font-medium text-muted-foreground">
                        {formatDateTime(event.occurredAt)}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-secondary/30 px-4 py-4 text-sm text-muted-foreground">
      {label}
    </div>
  );
}
