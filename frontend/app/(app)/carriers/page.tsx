"use client";

import { useDeferredValue, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { PaginationControls } from "@/components/app/pagination-controls";
import { StatusBadge } from "@/components/app/status-badge";
import { CarrierFormDialog } from "@/components/forms/carrier-form-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createCarrier, deleteCarrier, listCarriers, updateCarrier } from "@/services/carriers-service";
import { getErrorMessage } from "@/services/api-client";
import type { Carrier } from "@/types/api";

export default function CarriersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCarrier, setEditingCarrier] = useState<Carrier | null>(null);
  const deferredSearch = useDeferredValue(search);

  const carriersQuery = useQuery({
    queryKey: ["carriers", { page, deferredSearch, status }],
    queryFn: () =>
      listCarriers({
        page,
        pageSize: 8,
        search: deferredSearch || undefined,
        status: status || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: createCarrier,
    onSuccess: () => {
      toast.success("Transportadora cadastrada.");
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["carriers"] });
      queryClient.invalidateQueries({ queryKey: ["containers"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateCarrier>[1] }) =>
      updateCarrier(id, payload),
    onSuccess: () => {
      toast.success("Transportadora atualizada.");
      setDialogOpen(false);
      setEditingCarrier(null);
      queryClient.invalidateQueries({ queryKey: ["carriers"] });
      queryClient.invalidateQueries({ queryKey: ["containers"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCarrier,
    onSuccess: () => {
      toast.success("Transportadora removida.");
      queryClient.invalidateQueries({ queryKey: ["carriers"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Malha rodoviária"
        title="Transportadoras"
        description="Gerencie a frota parceira, contatos operacionais e capacidade de atendimento da última milha."
        actions={
          <Button
            onClick={() => {
              setEditingCarrier(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            Nova transportadora
          </Button>
        }
      />

      <Card>
        <CardContent className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
          <Input
            placeholder="Buscar nome, motorista ou CNPJ"
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
            <option value="DISPONIVEL">Disponível</option>
            <option value="EM_OPERACAO">Em operação</option>
            <option value="INATIVA">Inativa</option>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transportadora</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Motorista</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Atendimentos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carriersQuery.data?.data.map((carrierItem) => (
                <TableRow key={carrierItem.id}>
                  <TableCell>
                    <div className="font-semibold">{carrierItem.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {carrierItem.truckPlate}
                    </div>
                  </TableCell>
                  <TableCell>{carrierItem.cnpj}</TableCell>
                  <TableCell>{carrierItem.driverName}</TableCell>
                  <TableCell>
                    <div>{carrierItem.phone}</div>
                    <div className="text-xs text-muted-foreground">
                      {carrierItem.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={carrierItem.status} />
                  </TableCell>
                  <TableCell>{carrierItem._count?.containers ?? 0} contêineres</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingCarrier(carrierItem);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (window.confirm("Deseja remover esta transportadora?")) {
                            deleteMutation.mutate(carrierItem.id);
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
        meta={carriersQuery.data?.meta}
        onPrevious={() => setPage((current) => Math.max(1, current - 1))}
        onNext={() => setPage((current) => current + 1)}
      />

      <CarrierFormDialog
        key={`${editingCarrier?.id ?? "new"}-${dialogOpen ? "open" : "closed"}`}
        open={dialogOpen}
        onOpenChange={(nextOpen) => {
          setDialogOpen(nextOpen);
          if (!nextOpen) {
            setEditingCarrier(null);
          }
        }}
        initialData={editingCarrier}
        onSubmit={async (payload) => {
          if (editingCarrier) {
            await updateMutation.mutateAsync({ id: editingCarrier.id, payload });
            return;
          }

          await createMutation.mutateAsync(payload);
        }}
        submitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
