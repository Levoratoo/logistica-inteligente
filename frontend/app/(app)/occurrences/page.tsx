"use client";

import { useDeferredValue, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, CheckCheck, ShieldAlert, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";
import { OccurrenceSeverityBadge, OccurrenceStatusBadge } from "@/components/app/occurrence-badges";
import { PageHeader } from "@/components/app/page-header";
import { PaginationControls } from "@/components/app/pagination-controls";
import { StatCard } from "@/components/app/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatDateTime, formatOccurrenceCategory } from "@/lib/formatters";
import { getErrorMessage } from "@/services/api-client";
import { getDashboardOverview } from "@/services/dashboard-service";
import {
  assignOccurrence,
  listOccurrences,
  updateOccurrenceStatus,
} from "@/services/occurrences-service";
import { useAuth } from "@/components/app/auth-provider";

export default function OccurrencesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [category, setCategory] = useState("");
  const deferredSearch = useDeferredValue(search);

  const occurrencesQuery = useQuery({
    queryKey: ["occurrences", { page, deferredSearch, status, severity, category }],
    queryFn: () =>
      listOccurrences({
        page,
        pageSize: 8,
        search: deferredSearch || undefined,
        status: status || undefined,
        severity: severity || undefined,
        category: category || undefined,
      }),
  });
  const summaryQuery = useQuery({
    queryKey: ["occurrences-summary"],
    queryFn: () =>
      listOccurrences({
        page: 1,
        pageSize: 200,
      }),
  });
  const dashboardQuery = useQuery({
    queryKey: ["dashboard-overview-occurrences"],
    queryFn: getDashboardOverview,
  });

  const syncOccurrences = (message?: string) => {
    if (message) {
      toast.success(message);
    }

    queryClient.invalidateQueries({ queryKey: ["occurrences"] });
    queryClient.invalidateQueries({ queryKey: ["occurrences-summary"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-overview-occurrences"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-overview-topbar"] });
    queryClient.invalidateQueries({ queryKey: ["simulation-runtime"] });
    queryClient.invalidateQueries({ queryKey: ["simulation-runtime-topbar"] });
  };

  const assignMutation = useMutation({
    mutationFn: ({ occurrenceId, ownerName }: { occurrenceId: string; ownerName: string }) =>
      assignOccurrence(occurrenceId, ownerName),
    onSuccess: () => syncOccurrences("Ocorrencia assumida pela mesa operacional."),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ occurrenceId, status: nextStatus }: { occurrenceId: string; status: "RESOLVED" | "OPEN" }) =>
      updateOccurrenceStatus(
        occurrenceId,
        nextStatus,
        nextStatus === "RESOLVED"
          ? "Tratativa encerrada pela operacao."
          : "Ocorrencia reaberta para novo acompanhamento.",
      ),
    onSuccess: (_, variables) =>
      syncOccurrences(
        variables.status === "RESOLVED"
          ? "Ocorrencia resolvida."
          : "Ocorrencia reaberta.",
      ),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const items = occurrencesQuery.data?.data ?? [];
  const summaryItems = summaryQuery.data?.data ?? [];
  const openCount = dashboardQuery.data?.kpis.openOccurrences ?? 0;
  const inProgressCount = summaryItems.filter((item) => item.status === "IN_PROGRESS").length;
  const criticalCount = dashboardQuery.data?.kpis.criticalOccurrences ?? 0;
  const resolvedCount = summaryItems.filter((item) => item.status === "RESOLVED").length;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Governanca operacional"
        title="Central de Ocorrencias"
        description="Triage, assuma e resolva incidentes gerados automaticamente pelo motor de operacao do PortFlow."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Ocorrencias abertas"
          value={String(openCount)}
          helper="Aguardando acao imediata da operacao"
          icon={AlertTriangle}
        />
        <StatCard
          title="Em tratamento"
          value={String(inProgressCount)}
          helper="Ja assumidas por alguem da mesa operacional"
          icon={UserRoundCheck}
        />
        <StatCard
          title="Criticas"
          value={String(criticalCount)}
          helper="Maior impacto em SLA e experiencia do cliente"
          icon={ShieldAlert}
        />
        <StatCard
          title="Resolvidas"
          value={String(resolvedCount)}
          helper="Historico recente de tratativas encerradas"
          icon={CheckCheck}
        />
      </section>

      <Card>
        <CardContent className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
          <Input
            placeholder="Buscar por titulo, descricao ou origem"
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
          />
          <Select
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value);
            }}
          >
            <option value="">Todos os status</option>
            <option value="OPEN">Aberta</option>
            <option value="IN_PROGRESS">Em tratamento</option>
            <option value="RESOLVED">Resolvida</option>
          </Select>
          <Select
            value={severity}
            onChange={(event) => {
              setPage(1);
              setSeverity(event.target.value);
            }}
          >
            <option value="">Todas as severidades</option>
            <option value="LOW">Baixa</option>
            <option value="MEDIUM">Media</option>
            <option value="HIGH">Alta</option>
            <option value="CRITICAL">Critica</option>
          </Select>
          <Select
            value={category}
            onChange={(event) => {
              setPage(1);
              setCategory(event.target.value);
            }}
          >
            <option value="">Todas as categorias</option>
            <option value="SHIP_DELAY">Atraso de navio</option>
            <option value="CUSTOMS_HOLD">Retencao aduaneira</option>
            <option value="YARD_CONGESTION">Congestionamento de patio</option>
            <option value="TRANSPORT_DELAY">Atraso de transporte</option>
            <option value="DOCUMENT_REVIEW">Pendencia documental</option>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fila operacional</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-secondary/40 px-4 py-5 text-sm text-muted-foreground">
              Nenhuma ocorrencia encontrada para os filtros atuais.
            </div>
          ) : null}

          {items.map((occurrence) => (
            <div
              key={occurrence.id}
              className="rounded-3xl border border-border/80 bg-white/80 p-5"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <OccurrenceSeverityBadge value={occurrence.severity} />
                    <OccurrenceStatusBadge value={occurrence.status} />
                    <span className="text-xs font-medium text-muted-foreground">
                      {formatOccurrenceCategory(occurrence.category)}
                    </span>
                  </div>
                  <div>
                    <p className="font-display text-xl font-semibold">{occurrence.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {occurrence.description}
                    </p>
                  </div>
                  <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                    <span>Origem: {occurrence.sourceLabel}</span>
                    <span>SLA: {formatDateTime(occurrence.slaDeadlineAt)}</span>
                    <span>
                      Responsavel: {occurrence.ownerName ?? "Nao atribuido"}
                    </span>
                    <span>
                      Atualizado em: {formatDateTime(occurrence.updatedAt)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 xl:justify-end">
                  {!occurrence.ownerName ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        assignMutation.mutate({
                          occurrenceId: occurrence.id,
                          ownerName: user?.name ?? "Ops Desk",
                        })
                      }
                    >
                      <UserRoundCheck className="size-4" />
                      Assumir
                    </Button>
                  ) : null}

                  {occurrence.status !== "RESOLVED" ? (
                    <Button
                      size="sm"
                      onClick={() =>
                        resolveMutation.mutate({
                          occurrenceId: occurrence.id,
                          status: "RESOLVED",
                        })
                      }
                    >
                      <CheckCheck className="size-4" />
                      Resolver
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        resolveMutation.mutate({
                          occurrenceId: occurrence.id,
                          status: "OPEN",
                        })
                      }
                    >
                      <AlertTriangle className="size-4" />
                      Reabrir
                    </Button>
                  )}

                  {occurrence.container ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/container-details?id=${occurrence.container.id}`}>
                        <ArrowUpRight className="size-4" />
                        Abrir conteiner
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
                <div className="rounded-2xl bg-secondary/35 p-4 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Proxima acao recomendada
                  </p>
                  <p className="mt-2 text-foreground">{occurrence.recommendedAction}</p>
                </div>
                <div className="rounded-2xl bg-secondary/35 p-4 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Observacoes
                  </p>
                  <p className="mt-2 text-foreground">
                    {occurrence.notes ?? "Sem observacoes registradas."}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <PaginationControls
        meta={occurrencesQuery.data?.meta}
        onPrevious={() => setPage((current) => Math.max(1, current - 1))}
        onNext={() => setPage((current) => current + 1)}
      />
    </div>
  );
}
