"use client";

import { useDeferredValue, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { PaginationControls } from "@/components/app/pagination-controls";
import { StatusBadge } from "@/components/app/status-badge";
import { ShipFormDialog } from "@/components/forms/ship-form-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/formatters";
import { getErrorMessage } from "@/services/api-client";
import { createShip, deleteShip, listShips, updateShip } from "@/services/ships-service";
import type { Ship } from "@/types/api";

export default function ShipsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShip, setEditingShip] = useState<Ship | null>(null);
  const deferredSearch = useDeferredValue(search);

  const shipsQuery = useQuery({
    queryKey: ["ships", { page, deferredSearch, status, origin, destination }],
    queryFn: () =>
      listShips({
        page,
        pageSize: 8,
        search: deferredSearch || undefined,
        status: status || undefined,
        origin: origin || undefined,
        destination: destination || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: createShip,
    onSuccess: () => {
      toast.success("Navio cadastrado.");
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["ships"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateShip>[1] }) =>
      updateShip(id, payload),
    onSuccess: () => {
      toast.success("Navio atualizado.");
      setDialogOpen(false);
      setEditingShip(null);
      queryClient.invalidateQueries({ queryKey: ["ships"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteShip,
    onSuccess: () => {
      toast.success("Navio removido.");
      queryClient.invalidateQueries({ queryKey: ["ships"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Escalas portuárias"
        title="Navios"
        description="Planejamento de ETA/ETD, status de atracação e capacidade prevista de contêineres por escala."
        actions={
          <Button
            onClick={() => {
              setEditingShip(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            Novo navio
          </Button>
        }
      />

      <Card>
        <CardContent className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-5">
          <Input
            placeholder="Buscar navio ou armador"
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
            <option value="PREVISTO">Previsto</option>
            <option value="ATRACADO">Atracado</option>
            <option value="DESCARREGANDO">Descarregando</option>
            <option value="PARTIU">Partiu</option>
            <option value="ATRASADO">Atrasado</option>
          </Select>
          <Input
            placeholder="Origem"
            value={origin}
            onChange={(event) => {
              setPage(1);
              setOrigin(event.target.value);
            }}
          />
          <Input
            placeholder="Destino"
            value={destination}
            onChange={(event) => {
              setPage(1);
              setDestination(event.target.value);
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Navio</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Rota</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead>ETD</TableHead>
                <TableHead>Capacidade</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipsQuery.data?.data.map((shipItem) => (
                <TableRow key={shipItem.id}>
                  <TableCell className="font-semibold">{shipItem.name}</TableCell>
                  <TableCell>{shipItem.company}</TableCell>
                  <TableCell>
                    <div>{shipItem.origin}</div>
                    <div className="text-xs text-muted-foreground">
                      → {shipItem.destination}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={shipItem.status} />
                  </TableCell>
                  <TableCell>{formatDateTime(shipItem.eta)}</TableCell>
                  <TableCell>{formatDateTime(shipItem.etd)}</TableCell>
                  <TableCell>
                    {shipItem.expectedContainers} previstos ·{" "}
                    {shipItem._count?.containers ?? 0} vinculados
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingShip(shipItem);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (window.confirm("Deseja remover este navio?")) {
                            deleteMutation.mutate(shipItem.id);
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
        </CardContent>
      </Card>

      <PaginationControls
        meta={shipsQuery.data?.meta}
        onPrevious={() => setPage((current) => Math.max(1, current - 1))}
        onNext={() => setPage((current) => current + 1)}
      />

      <ShipFormDialog
        key={`${editingShip?.id ?? "new"}-${dialogOpen ? "open" : "closed"}`}
        open={dialogOpen}
        onOpenChange={(nextOpen) => {
          setDialogOpen(nextOpen);
          if (!nextOpen) {
            setEditingShip(null);
          }
        }}
        initialData={editingShip}
        onSubmit={async (payload) => {
          if (editingShip) {
            await updateMutation.mutateAsync({ id: editingShip.id, payload });
            return;
          }

          await createMutation.mutateAsync(payload);
        }}
        submitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
