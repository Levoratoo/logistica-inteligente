import { Badge } from "@/components/ui/badge";
import { formatDocumentStatus } from "@/lib/formatters";
import type { ContainerDocumentStatus } from "@/types/api";

export function DocumentStatusBadge({
  value,
}: {
  value: ContainerDocumentStatus;
}) {
  const variant =
    value === "APPROVED"
      ? "success"
      : value === "PENDING_REVIEW"
        ? "warning"
        : value === "REJECTED"
          ? "danger"
          : "neutral";

  return <Badge variant={variant}>{formatDocumentStatus(value)}</Badge>;
}
