"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeftRight, CalendarClock, Ship, Truck } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Timeline } from "@/components/app/timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatWeight } from "@/lib/formatters";
import { getContainer } from "@/services/containers-service";

export default function ContainerDetailsPage() {
  const searchParams = useSearchParams();
  const containerId = searchParams.get("id") ?? "";

  const containerQuery = useQuery({
    queryKey: ["container-details", containerId],
    queryFn: () => getContainer(containerId),
    enabled: Boolean(containerId),
  });

  const containerItem = containerQuery.data;

  if (!containerId) {
    return (
      <Card>
        <CardContent className="p-8 text-sm text-muted-foreground">
          Nenhum contêiner foi selecionado.
        </CardContent>
      </Card>
    );
  }

  if (!containerItem) {
    return (
      <Card>
        <CardContent className="p-8 text-sm text-muted-foreground">
          Carregando detalhes do contêiner...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Detalhe operacional"
        title={containerItem.containerCode}
        description="Visão consolidada de vínculos, datas críticas, rota e histórico operacional da unidade."
        actions={
          <Button asChild variant="outline">
            <Link href="/simulation">Abrir Simulation Center</Link>
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={ArrowLeftRight}
          label="Rota"
          value={`${containerItem.origin} → ${containerItem.destination}`}
        />
        <MetricCard
          icon={Ship}
          label="Navio"
          value={containerItem.ship?.name ?? "Sem vínculo"}
        />
        <MetricCard
          icon={Truck}
          label="Transportadora"
          value={containerItem.carrier?.name ?? "Sem vínculo"}
        />
        <MetricCard
          icon={CalendarClock}
          label="Próxima data"
          value={formatDateTime(containerItem.deliveredAt ?? containerItem.eta)}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Ficha do contêiner</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <InfoRow label="Status">
              <StatusBadge value={containerItem.status} />
            </InfoRow>
            <InfoRow label="Cliente">{containerItem.clientName}</InfoRow>
            <InfoRow label="Tipo">{containerItem.type}</InfoRow>
            <InfoRow label="Peso">{formatWeight(containerItem.weight)}</InfoRow>
            <InfoRow label="Descrição">{containerItem.cargoDescription}</InfoRow>
            <InfoRow label="Lacre">{containerItem.sealNumber ?? "Não informado"}</InfoRow>
            <InfoRow label="ETA">{formatDateTime(containerItem.eta)}</InfoRow>
            <InfoRow label="Booking">{formatDateTime(containerItem.bookingDate)}</InfoRow>
            <InfoRow label="Entrada no porto">{formatDateTime(containerItem.portEntryAt)}</InfoRow>
            <InfoRow label="Descarregado em">{formatDateTime(containerItem.unloadedAt)}</InfoRow>
            <InfoRow label="Fiscalização">
              {formatDateTime(containerItem.inspectionStartedAt)}
            </InfoRow>
            <InfoRow label="Liberado em">
              {formatDateTime(containerItem.customsReleasedAt)}
            </InfoRow>
            <InfoRow label="Saída para transporte">
              {formatDateTime(containerItem.transportStartedAt)}
            </InfoRow>
            <InfoRow label="Entregue em">{formatDateTime(containerItem.deliveredAt)}</InfoRow>
            <InfoRow label="Observações">
              {containerItem.notes ?? "Sem observações operacionais"}
            </InfoRow>
          </CardContent>
        </Card>

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
