"use client";

import { useDeferredValue, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ContainerFormDialog } from "@/components/forms/container-form-dialog";
import { PageHeader } from "@/components/app/page-header";
import { PaginationControls } from "@/components/app/pagination-controls";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  createContainer,
  deleteContainer,
  listContainers,
  updateContainer,
} from "@/services/containers-service";
import { listShips } from "@/services/ships-service";
import { listCarriers } from "@/services/carriers-service";
import { getErrorMessage } from "@/services/api-client";
import { formatDateTime, formatWeight } from "@/lib/formatters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Container } from "@/types/api";

export default function ContainersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [shipId, setShipId] = useState("");
  const [carrierId, setCarrierId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContainer, setEditingContainer] = useState<Container | null>(null);
  const deferredSearch = useDeferredValue(search);

  const containersQuery = useQuery({
    queryKey: [
      "containers",
      { page, deferredSearch, status, origin, destination, shipId, carrierId },
    ],
    queryFn: () =>
      listContainers({
        page,
        pageSize: 8,
        search: deferredSearch || undefined,
        status: status || undefined,
        origin: origin || undefined,
        destination: destination || undefined,
        shipId: shipId || undefined,
        carrierId: carrierId || undefined,
      }),
  });

  const shipsQuery = useQuery({
    queryKey: ["ships-options"],
    queryFn: () => listShips({ page: 1, pageSize: 50 }),
  });

  const carriersQuery = useQuery({
    queryKey: ["carriers-options"],
    queryFn: () => listCarriers({ page: 1, pageSize: 50 }),
  });

  const createMutation = useMutation({
    mutationFn: createContainer,
    onSuccess: () => {
      toast.success("Contêiner criado com sucesso.");
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview-topbar"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateContainer>[1] }) =>
      updateContainer(id, payload),
    onSuccess: () => {
      toast.success("Contêiner atualizado.");
      setDialogOpen(false);
      setEditingContainer(null);
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteContainer,
    onSuccess: () => {
      toast.success("Contêiner removido.");
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  async function handleSubmit(payload: Parameters<typeof createContainer>[0]) {
    if (editingContainer) {
      await updateMutation.mutateAsync({ id: editingContainer.id, payload });
      return;
    }

    await createMutation.mutateAsync(payload);
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Gestão operacional"
        title="Contêineres"
        description="Controle completo da operação de importação, desde previsão de chegada até entrega final, com filtros e histórico operacional."
        actions={
          <Button
            onClick={() => {
              setEditingContainer(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            Novo contêiner
          </Button>
        }
      />

      <Card>
        <CardContent className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-6">
          <Input
            placeholder="Buscar por código, cliente ou carga"
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
            <option value="AGUARDANDO_NAVIO">Aguardando navio</option>
            <option value="NO_PORTO">No porto</option>
            <option value="EM_FISCALIZACAO">Em fiscalização</option>
            <option value="LIBERADO">Liberado</option>
            <option value="EM_TRANSPORTE">Em transporte</option>
            <option value="ENTREGUE">Entregue</option>
            <option value="ATRASADO">Atrasado</option>
          </Select>
          <Input
            placeholder="Filtrar origem"
            value={origin}
            onChange={(event) => {
              setPage(1);
              setOrigin(event.target.value);
            }}
          />
          <Input
            placeholder="Filtrar destino"
            value={destination}
            onChange={(event) => {
              setPage(1);
              setDestination(event.target.value);
            }}
          />
          <Select
            value={shipId}
            onChange={(event) => {
              setPage(1);
              setShipId(event.target.value);
            }}
          >
            <option value="">Todos os navios</option>
            {shipsQuery.data?.data.map((shipItem) => (
              <option key={shipItem.id} value={shipItem.id}>
                {shipItem.name}
              </option>
            ))}
          </Select>
          <Select
            value={carrierId}
            onChange={(event) => {
              setPage(1);
              setCarrierId(event.target.value);
            }}
          >
            <option value="">Todas as transportadoras</option>
            {carriersQuery.data?.data.map((carrierItem) => (
              <option key={carrierItem.id} value={carrierItem.id}>
                {carrierItem.name}
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contêiner</TableHead>
                <TableHead>Cliente / Carga</TableHead>
                <TableHead>Rota</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Navio</TableHead>
                <TableHead>Transportadora</TableHead>
                <TableHead>Peso</TableHead>
                <TableHead>Atualizado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {containersQuery.data?.data.map((containerItem) => (
                <TableRow key={containerItem.id}>
                  <TableCell>
                    <div className="font-semibold">{containerItem.containerCode}</div>
                    <div className="text-xs text-muted-foreground">{containerItem.type}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{containerItem.clientName}</div>
                    <div className="text-xs text-muted-foreground">
                      {containerItem.cargoDescription}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>{containerItem.origin}</div>
                    <div className="text-xs text-muted-foreground">
                      → {containerItem.destination}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={containerItem.status} />
                  </TableCell>
                  <TableCell>{containerItem.ship?.name ?? "Sem vínculo"}</TableCell>
                  <TableCell>{containerItem.carrier?.name ?? "Sem vínculo"}</TableCell>
                  <TableCell>{formatWeight(containerItem.weight)}</TableCell>
                  <TableCell>{formatDateTime(containerItem.updatedAt)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          router.push(`/container-details?id=${containerItem.id}`)
                        }
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingContainer(containerItem);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (window.confirm("Deseja remover este contêiner?")) {
                            deleteMutation.mutate(containerItem.id);
                          }
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!containersQuery.data?.data.length ? (
            <div className="p-8 text-sm text-muted-foreground">
              Nenhum contêiner encontrado para os filtros informados.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <PaginationControls
        meta={containersQuery.data?.meta}
        onPrevious={() => setPage((current) => Math.max(1, current - 1))}
        onNext={() => setPage((current) => current + 1)}
      />

      <ContainerFormDialog
        key={`${editingContainer?.id ?? "new"}-${dialogOpen ? "open" : "closed"}`}
        open={dialogOpen}
        onOpenChange={(nextOpen) => {
          setDialogOpen(nextOpen);
          if (!nextOpen) {
            setEditingContainer(null);
          }
        }}
        initialData={editingContainer}
        ships={shipsQuery.data?.data ?? []}
        carriers={carriersQuery.data?.data ?? []}
        onSubmit={handleSubmit}
        submitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
