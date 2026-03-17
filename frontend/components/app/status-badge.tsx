import { Badge } from "@/components/ui/badge";
import { formatStatusLabel } from "@/lib/formatters";
import type {
  CarrierStatus,
  ContainerStatus,
  EventType,
  ShipStatus,
} from "@/types/api";

export function StatusBadge({
  value,
}: {
  value: ContainerStatus | ShipStatus | CarrierStatus | EventType;
}) {
  const variant =
    value === "ENTREGUE" || value === "DISPONIVEL" || value === "LIBERADO"
      ? "success"
      : value === "ATRASADO" || value === "INATIVA"
        ? "danger"
        : value === "EM_FISCALIZACAO" || value === "AGUARDANDO_NAVIO"
          ? "warning"
          : "info";

  return <Badge variant={variant}>{formatStatusLabel(value)}</Badge>;
}
