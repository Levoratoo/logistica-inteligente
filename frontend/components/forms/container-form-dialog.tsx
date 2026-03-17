"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toDateTimeLocalValue } from "@/lib/formatters";
import type { Carrier, Container, ContainerPayload, Ship } from "@/types/api";

const emptyState = {
  containerCode: "",
  type: "FT20",
  weight: "0",
  cargoDescription: "",
  clientName: "",
  origin: "",
  destination: "",
  status: "AGUARDANDO_NAVIO",
  shipId: "",
  carrierId: "",
  eta: "",
  bookingDate: "",
  sealNumber: "",
  notes: "",
};

function getInitialState(initialData?: Container | null) {
  if (!initialData) {
    return emptyState;
  }

  return {
    containerCode: initialData.containerCode,
    type: initialData.type,
    weight: String(initialData.weight),
    cargoDescription: initialData.cargoDescription,
    clientName: initialData.clientName,
    origin: initialData.origin,
    destination: initialData.destination,
    status: initialData.status,
    shipId: initialData.shipId ?? "",
    carrierId: initialData.carrierId ?? "",
    eta: toDateTimeLocalValue(initialData.eta),
    bookingDate: toDateTimeLocalValue(initialData.bookingDate),
    sealNumber: initialData.sealNumber ?? "",
    notes: initialData.notes ?? "",
  };
}

export function ContainerFormDialog({
  open,
  onOpenChange,
  initialData,
  ships,
  carriers,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Container | null;
  ships: Ship[];
  carriers: Carrier[];
  onSubmit: (payload: ContainerPayload) => Promise<void> | void;
  submitting: boolean;
}) {
  const [form, setForm] = useState(() => getInitialState(initialData));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      containerCode: form.containerCode,
      type: form.type as ContainerPayload["type"],
      weight: Number(form.weight),
      cargoDescription: form.cargoDescription,
      clientName: form.clientName,
      origin: form.origin,
      destination: form.destination,
      status: form.status as ContainerPayload["status"],
      shipId: form.shipId || undefined,
      carrierId: form.carrierId || undefined,
      eta: form.eta || undefined,
      bookingDate: form.bookingDate || undefined,
      sealNumber: form.sealNumber || undefined,
      notes: form.notes || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Editar contêiner" : "Novo contêiner"}
          </DialogTitle>
          <DialogDescription>
            Cadastro operacional com vínculo de navio, transportadora e parâmetros de movimentação.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Código do contêiner">
              <Input
                required
                value={form.containerCode}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    containerCode: event.target.value.toUpperCase(),
                  }))
                }
              />
            </Field>
            <Field label="Tipo">
              <Select
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({ ...current, type: event.target.value }))
                }
              >
                <option value="FT20">20ft</option>
                <option value="FT40">40ft</option>
              </Select>
            </Field>
            <Field label="Peso (kg)">
              <Input
                required
                min={0}
                type="number"
                value={form.weight}
                onChange={(event) =>
                  setForm((current) => ({ ...current, weight: event.target.value }))
                }
              />
            </Field>
            <Field label="Cliente">
              <Input
                required
                value={form.clientName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    clientName: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Origem">
              <Input
                required
                value={form.origin}
                onChange={(event) =>
                  setForm((current) => ({ ...current, origin: event.target.value }))
                }
              />
            </Field>
            <Field label="Destino">
              <Input
                required
                value={form.destination}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    destination: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({ ...current, status: event.target.value }))
                }
              >
                <option value="AGUARDANDO_NAVIO">Aguardando navio</option>
                <option value="NO_PORTO">No porto</option>
                <option value="EM_FISCALIZACAO">Em fiscalização</option>
                <option value="LIBERADO">Liberado</option>
                <option value="EM_TRANSPORTE">Em transporte</option>
                <option value="ENTREGUE">Entregue</option>
                <option value="ATRASADO">Atrasado</option>
              </Select>
            </Field>
            <Field label="Lacre">
              <Input
                value={form.sealNumber}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sealNumber: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Navio">
              <Select
                value={form.shipId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, shipId: event.target.value }))
                }
              >
                <option value="">Sem vínculo</option>
                {ships.map((ship) => (
                  <option key={ship.id} value={ship.id}>
                    {ship.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Transportadora">
              <Select
                value={form.carrierId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    carrierId: event.target.value,
                  }))
                }
              >
                <option value="">Sem vínculo</option>
                {carriers.map((carrier) => (
                  <option key={carrier.id} value={carrier.id}>
                    {carrier.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="ETA">
              <Input
                type="datetime-local"
                value={form.eta}
                onChange={(event) =>
                  setForm((current) => ({ ...current, eta: event.target.value }))
                }
              />
            </Field>
            <Field label="Data de booking">
              <Input
                type="datetime-local"
                value={form.bookingDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    bookingDate: event.target.value,
                  }))
                }
              />
            </Field>
          </div>

          <Field label="Descrição da carga">
            <Textarea
              required
              value={form.cargoDescription}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  cargoDescription: event.target.value,
                }))
              }
            />
          </Field>

          <Field label="Observações">
            <Textarea
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </Field>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando..." : initialData ? "Atualizar" : "Criar contêiner"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
