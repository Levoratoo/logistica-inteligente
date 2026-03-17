"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Radar, Search } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Timeline } from "@/components/app/timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDateTime, formatWeight } from "@/lib/formatters";
import { trackContainer } from "@/services/containers-service";

export default function TrackingPage() {
  const [containerCode, setContainerCode] = useState("MSKU5274910");
  const [submittedCode, setSubmittedCode] = useState("MSKU5274910");

  const trackingQuery = useQuery({
    queryKey: ["tracking", submittedCode],
    queryFn: () => trackContainer(submittedCode),
    enabled: Boolean(submittedCode),
  });

  const containerItem = trackingQuery.data;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Rastreamento logístico"
        title="Tracking Center"
        description="Acompanhe um contêiner por código e visualize a linha do tempo completa da operação."
      />

      <Card>
        <CardContent className="grid gap-4 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Digite o código do contêiner"
              value={containerCode}
              onChange={(event) => setContainerCode(event.target.value.toUpperCase())}
            />
          </div>
          <Button onClick={() => setSubmittedCode(containerCode.trim().toUpperCase())}>
            <Radar className="size-4" />
            Rastrear contêiner
          </Button>
        </CardContent>
      </Card>

      {containerItem ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Código" value={containerItem.containerCode} />
            <SummaryCard label="Cliente" value={containerItem.clientName} />
            <SummaryCard
              label="Peso"
              value={formatWeight(containerItem.weight)}
            />
            <SummaryCard
              label="ETA / Entrega"
              value={formatDateTime(containerItem.deliveredAt ?? containerItem.eta)}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Status atual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-display text-2xl font-semibold">
                      {containerItem.containerCode}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {containerItem.origin} → {containerItem.destination}
                    </p>
                  </div>
                  <StatusBadge value={containerItem.status} />
                </div>
                <div className="grid gap-3 text-sm text-muted-foreground">
                  <span>Navio: {containerItem.ship?.name ?? "Sem vínculo"}</span>
                  <span>
                    Transportadora: {containerItem.carrier?.name ?? "Sem vínculo"}
                  </span>
                  <span>Carga: {containerItem.cargoDescription}</span>
                  <span>Última atualização: {formatDateTime(containerItem.updatedAt)}</span>
                </div>
                <Button asChild variant="outline">
                  <Link href={`/container-details?id=${containerItem.id}`}>
                    Abrir detalhe completo
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Timeline events={containerItem.events ?? []} title="Linha do tempo visual" />
          </section>
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-sm text-muted-foreground">
            Digite um código válido para iniciar o rastreamento.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
