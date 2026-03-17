"use client";

import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeftRight,
  CalendarClock,
  FileCheck2,
  FileWarning,
  ScanSearch,
  Ship,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/app/auth-provider";
import { DocumentStatusBadge } from "@/components/app/document-badges";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Timeline } from "@/components/app/timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatDateTime,
  formatDocumentType,
  formatWeight,
} from "@/lib/formatters";
import { getErrorMessage } from "@/services/api-client";
import { updateContainerDocumentStatus } from "@/services/container-documents-service";
import { getContainer } from "@/services/containers-service";
import type {
  Container,
  ContainerDocument,
  ContainerDocumentStage,
  ContainerDocumentStatus,
} from "@/types/api";

export default function ContainerDetailsPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const containerId = searchParams.get("id") ?? "";

  const containerQuery = useQuery({
    queryKey: ["container-details", containerId],
    queryFn: () => getContainer(containerId),
    enabled: Boolean(containerId),
  });

  const documentMutation = useMutation({
    mutationFn: ({
      documentId,
      status,
      notes,
    }: {
      documentId: string;
      status: ContainerDocumentStatus;
      notes: string;
    }) =>
      updateContainerDocumentStatus(
        containerId,
        documentId,
        status,
        notes,
        user?.name ?? "Mesa operacional",
      ),
    onSuccess: (_, variables) => {
      toast.success(getDocumentSuccessLabel(variables.status));
      queryClient.invalidateQueries({ queryKey: ["container-details", containerId] });
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      queryClient.invalidateQueries({ queryKey: ["tracking"] });
      queryClient.invalidateQueries({ queryKey: ["occurrences"] });
      queryClient.invalidateQueries({ queryKey: ["occurrences-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview-occurrences"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview-topbar"] });
      queryClient.invalidateQueries({ queryKey: ["control-tower-overview"] });
      queryClient.invalidateQueries({ queryKey: ["client-portal-overview"] });
      queryClient.invalidateQueries({ queryKey: ["client-portal-topbar"] });
      queryClient.invalidateQueries({ queryKey: ["simulation-runtime"] });
      queryClient.invalidateQueries({ queryKey: ["simulation-runtime-topbar"] });
      queryClient.invalidateQueries({ queryKey: ["simulation-containers"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const containerItem = containerQuery.data;
  const isClientView = user?.accountType === "CLIENT";

  if (!containerId) {
    return (
      <Card>
        <CardContent className="p-8 text-sm text-muted-foreground">
          Nenhum conteiner foi selecionado.
        </CardContent>
      </Card>
    );
  }

  if (!containerItem) {
    return (
      <Card>
        <CardContent className="p-8 text-sm text-muted-foreground">
          Carregando detalhes do conteiner...
        </CardContent>
      </Card>
    );
  }

  if (isClientView && containerItem.clientName !== user?.clientName) {
    return (
      <Card>
        <CardContent className="grid gap-4 p-8 text-sm text-muted-foreground">
          <p>Este conteiner nao pertence a conta autenticada.</p>
          <div>
            <Button asChild variant="outline">
              <Link href="/client-portal">Voltar ao portal do cliente</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const documents = containerItem.documents ?? [];
  const workflow = containerItem.documentWorkflow;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Detalhe operacional"
        title={containerItem.containerCode}
        description={
          isClientView
            ? "Visao do cliente com marcos logísticos, status documental e progresso da sua carga."
            : "Visao consolidada de vinculos, datas criticas, workflow documental e historico operacional da unidade."
        }
        actions={(
          <>
            {isClientView ? (
              <Button asChild variant="outline">
                <Link href="/client-portal">Voltar ao meu portal</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="outline">
                  <Link href="/control-tower">Abrir Torre de Controle</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/simulation">Abrir Simulation Center</Link>
                </Button>
              </>
            )}
          </>
        )}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          icon={ArrowLeftRight}
          label="Rota"
          value={`${containerItem.origin} -> ${containerItem.destination}`}
        />
        <MetricCard
          icon={Ship}
          label="Navio"
          value={containerItem.ship?.name ?? "Sem vinculo"}
        />
        <MetricCard
          icon={Truck}
          label="Transportadora"
          value={containerItem.carrier?.name ?? "Sem vinculo"}
        />
        <MetricCard
          icon={CalendarClock}
          label="Proxima data"
          value={formatDateTime(containerItem.deliveredAt ?? containerItem.eta)}
        />
        <MetricCard
          icon={FileCheck2}
          label="Aprovados"
          value={String(workflow?.approvedDocuments ?? 0)}
        />
        <MetricCard
          icon={FileWarning}
          label="Bloqueios"
          value={String(workflow?.blockedStages.length ?? 0)}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Ficha do conteiner</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <InfoRow label="Status">
                <StatusBadge value={containerItem.status} />
              </InfoRow>
              <InfoRow label="Cliente">{containerItem.clientName}</InfoRow>
              <InfoRow label="Tipo">{containerItem.type}</InfoRow>
              <InfoRow label="Peso">{formatWeight(containerItem.weight)}</InfoRow>
              <InfoRow label="Descricao">{containerItem.cargoDescription}</InfoRow>
              <InfoRow label="Lacre">{containerItem.sealNumber ?? "Nao informado"}</InfoRow>
              <InfoRow label="ETA">{formatDateTime(containerItem.eta)}</InfoRow>
              <InfoRow label="Booking">{formatDateTime(containerItem.bookingDate)}</InfoRow>
              <InfoRow label="Entrada no porto">{formatDateTime(containerItem.portEntryAt)}</InfoRow>
              <InfoRow label="Descarregado em">{formatDateTime(containerItem.unloadedAt)}</InfoRow>
              <InfoRow label="Fiscalizacao">
                {formatDateTime(containerItem.inspectionStartedAt)}
              </InfoRow>
              <InfoRow label="Liberado em">
                {formatDateTime(containerItem.customsReleasedAt)}
              </InfoRow>
              <InfoRow label="Saida para transporte">
                {formatDateTime(containerItem.transportStartedAt)}
              </InfoRow>
              <InfoRow label="Entregue em">{formatDateTime(containerItem.deliveredAt)}</InfoRow>
              <InfoRow label="Observacoes">
                {containerItem.notes ?? "Sem observacoes operacionais"}
              </InfoRow>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workflow documental</CardTitle>
              <p className="text-sm text-muted-foreground">
                {isClientView
                  ? "Checklist documental acompanhado pela equipe PortFlow para manter sua carga em fluxo."
                  : "O checklist abaixo interfere diretamente na liberacao, expedicao e entrega."}
              </p>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="grid gap-3 md:grid-cols-3">
                <StageCard
                  title="Liberacao"
                  ready={workflow?.customsReady ?? false}
                  helper="Pacote aduaneiro"
                />
                <StageCard
                  title="Expedicao"
                  ready={workflow?.dispatchReady ?? false}
                  helper="Saida do patio"
                />
                <StageCard
                  title="Entrega"
                  ready={workflow?.deliveryReady ?? false}
                  helper="Trecho final"
                />
              </div>

              {workflow?.blockingReason ? (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                  <p className="font-semibold">Bloqueio operacional ativo</p>
                  <p className="mt-1 leading-6">{workflow.blockingReason}</p>
                </div>
              ) : (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
                  Checklist em ordem. O conteiner pode continuar avancando conforme a operacao.
                </div>
              )}

              <div className="space-y-4">
                {documents.map((document) => (
                  <DocumentRow
                    key={document.id}
                    container={containerItem}
                    document={document}
                    pending={documentMutation.isPending}
                    readonly={isClientView}
                    onChange={(status, notes) =>
                      documentMutation.mutate({
                        documentId: document.id,
                        status,
                        notes,
                      })
                    }
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Timeline events={containerItem.events ?? []} />
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Ship;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-6">
        <div className="rounded-2xl bg-primary/10 p-3 text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 font-medium">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1 rounded-2xl border border-border/80 bg-white/75 p-4">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <div className="text-foreground">{children}</div>
    </div>
  );
}

function StageCard({
  title,
  helper,
  ready,
}: {
  title: string;
  helper: string;
  ready: boolean;
}) {
  return (
    <div
      className={[
        "rounded-3xl border p-4",
        ready
          ? "border-emerald-200 bg-emerald-50"
          : "border-amber-200 bg-amber-50",
      ].join(" ")}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </p>
      <p className="mt-2 font-display text-xl font-semibold">
        {ready ? "Pronto" : "Bloqueado"}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{helper}</p>
    </div>
  );
}

function DocumentRow({
  container,
  document,
  pending,
  readonly,
  onChange,
}: {
  container: Container;
  document: ContainerDocument;
  pending: boolean;
  readonly?: boolean;
  onChange: (status: ContainerDocumentStatus, notes: string) => void;
}) {
  return (
    <div className="rounded-3xl border border-border/80 bg-white/75 p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <DocumentStatusBadge value={document.status} />
            {document.requiredFor.map((stage) => (
              <span
                key={stage}
                className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                {formatStageLabel(stage)}
              </span>
            ))}
          </div>
          <div>
            <p className="font-semibold">{formatDocumentType(document.type)}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {document.notes ?? "Documento ainda sem tratativa manual registrada."}
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs font-medium text-muted-foreground">
            <span>Atualizado: {formatDateTime(document.updatedAt)}</span>
            <span>Responsavel: {document.reviewedBy ?? "Motor autonomo"}</span>
            <span>Conteiner: {container.containerCode}</span>
          </div>
        </div>

        {readonly ? (
          <div className="xl:w-[228px]">
            <div className="rounded-2xl border border-dashed border-border bg-secondary/30 px-4 py-4 text-sm text-muted-foreground">
              Acompanhamento somente leitura para o cliente.
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 xl:w-[228px]">
            <Button
              variant="outline"
              disabled={pending || document.status === "PENDING_REVIEW"}
              onClick={() =>
                onChange(
                  "PENDING_REVIEW",
                  "Documento recebido e encaminhado para conferencia.",
                )
              }
            >
              <ScanSearch className="size-4" />
              Receber
            </Button>
            <Button
              disabled={pending || document.status === "APPROVED"}
              onClick={() =>
                onChange(
                  "APPROVED",
                  "Documento aprovado manualmente pela mesa operacional.",
                )
              }
            >
              <FileCheck2 className="size-4" />
              Aprovar
            </Button>
            <Button
              variant="outline"
              disabled={pending || document.status === "REJECTED"}
              onClick={() =>
                onChange(
                  "REJECTED",
                  "Documento devolvido para ajuste ou complemento.",
                )
              }
            >
              <FileWarning className="size-4" />
              Rejeitar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatStageLabel(stage: ContainerDocumentStage) {
  const labels: Record<ContainerDocumentStage, string> = {
    CUSTOMS_RELEASE: "Liberacao",
    DISPATCH: "Expedicao",
    DELIVERY: "Entrega",
  };

  return labels[stage];
}

function getDocumentSuccessLabel(status: ContainerDocumentStatus) {
  const labels: Record<ContainerDocumentStatus, string> = {
    MISSING: "Documento marcado como ausente.",
    PENDING_REVIEW: "Documento enviado para conferencia.",
    APPROVED: "Documento aprovado com sucesso.",
    REJECTED: "Documento rejeitado e sinalizado para ajuste.",
  };

  return labels[status];
}
