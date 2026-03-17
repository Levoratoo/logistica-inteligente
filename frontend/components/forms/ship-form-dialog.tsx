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
import { toDateTimeLocalValue } from "@/lib/formatters";
import type { Ship, ShipPayload } from "@/types/api";

const emptyState = {
  name: "",
  company: "",
  eta: "",
  etd: "",
  origin: "",
  destination: "",
  status: "PREVISTO",
  expectedContainers: "1",
};

function getInitialState(initialData?: Ship | null) {
  if (!initialData) {
    return emptyState;
  }

  return {
    name: initialData.name,
    company: initialData.company,
    eta: toDateTimeLocalValue(initialData.eta),
    etd: toDateTimeLocalValue(initialData.etd),
    origin: initialData.origin,
    destination: initialData.destination,
    status: initialData.status,
    expectedContainers: String(initialData.expectedContainers),
  };
}

export function ShipFormDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Ship | null;
  onSubmit: (payload: ShipPayload) => Promise<void> | void;
  submitting: boolean;
}) {
  const [form, setForm] = useState(() => getInitialState(initialData));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      name: form.name,
      company: form.company,
      eta: form.eta,
      etd: form.etd || undefined,
      origin: form.origin,
      destination: form.destination,
      status: form.status as ShipPayload["status"],
      expectedContainers: Number(form.expectedContainers),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar navio" : "Novo navio"}</DialogTitle>
          <DialogDescription>
            Cadastro da escala portuária com parâmetros de ETA, ETD e capacidade prevista.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nome">
              <Input
                required
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </Field>
            <Field label="Empresa">
              <Input
                required
                value={form.company}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    company: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="ETA">
              <Input
                required
                type="datetime-local"
                value={form.eta}
                onChange={(event) =>
                  setForm((current) => ({ ...current, eta: event.target.value }))
                }
              />
            </Field>
            <Field label="ETD">
              <Input
                type="datetime-local"
                value={form.etd}
                onChange={(event) =>
                  setForm((current) => ({ ...current, etd: event.target.value }))
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
                <option value="PREVISTO">Previsto</option>
                <option value="ATRACADO">Atracado</option>
                <option value="DESCARREGANDO">Descarregando</option>
                <option value="PARTIU">Partiu</option>
                <option value="ATRASADO">Atrasado</option>
              </Select>
            </Field>
            <Field label="Contêineres previstos">
              <Input
                required
                min={1}
                type="number"
                value={form.expectedContainers}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    expectedContainers: event.target.value,
                  }))
                }
              />
            </Field>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando..." : initialData ? "Atualizar" : "Criar navio"}
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
