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
import type { Carrier, CarrierPayload } from "@/types/api";

const emptyState = {
  name: "",
  cnpj: "",
  driverName: "",
  truckPlate: "",
  phone: "",
  email: "",
  status: "DISPONIVEL",
};

function getInitialState(initialData?: Carrier | null) {
  if (!initialData) {
    return emptyState;
  }

  return {
    name: initialData.name,
    cnpj: initialData.cnpj,
    driverName: initialData.driverName,
    truckPlate: initialData.truckPlate,
    phone: initialData.phone,
    email: initialData.email,
    status: initialData.status,
  };
}

export function CarrierFormDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Carrier | null;
  onSubmit: (payload: CarrierPayload) => Promise<void> | void;
  submitting: boolean;
}) {
  const [form, setForm] = useState(() => getInitialState(initialData));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      name: form.name,
      cnpj: form.cnpj,
      driverName: form.driverName,
      truckPlate: form.truckPlate,
      phone: form.phone,
      email: form.email,
      status: form.status as CarrierPayload["status"],
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Editar transportadora" : "Nova transportadora"}
          </DialogTitle>
          <DialogDescription>
            Informações operacionais do parceiro rodoviário responsável pela última milha.
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
            <Field label="CNPJ">
              <Input
                required
                value={form.cnpj}
                onChange={(event) =>
                  setForm((current) => ({ ...current, cnpj: event.target.value }))
                }
              />
            </Field>
            <Field label="Motorista responsável">
              <Input
                required
                value={form.driverName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    driverName: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Placa do caminhão">
              <Input
                required
                value={form.truckPlate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    truckPlate: event.target.value.toUpperCase(),
                  }))
                }
              />
            </Field>
            <Field label="Telefone">
              <Input
                required
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, phone: event.target.value }))
                }
              />
            </Field>
            <Field label="Email">
              <Input
                required
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
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
                <option value="DISPONIVEL">Disponível</option>
                <option value="EM_OPERACAO">Em operação</option>
                <option value="INATIVA">Inativa</option>
              </Select>
            </Field>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando..." : initialData ? "Atualizar" : "Criar transportadora"}
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
