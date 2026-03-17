import { Badge } from "@/components/ui/badge";
import {
  formatOccurrenceSeverity,
  formatOccurrenceStatus,
} from "@/lib/formatters";
import type {
  OccurrenceSeverity,
  OccurrenceStatus,
} from "@/types/api";

export function OccurrenceSeverityBadge({
  value,
}: {
  value: OccurrenceSeverity;
}) {
  const variant =
    value === "CRITICAL"
      ? "danger"
      : value === "HIGH"
        ? "warning"
        : value === "MEDIUM"
          ? "info"
          : "success";

  return <Badge variant={variant}>{formatOccurrenceSeverity(value)}</Badge>;
}

export function OccurrenceStatusBadge({
  value,
}: {
  value: OccurrenceStatus;
}) {
  const variant =
    value === "RESOLVED"
      ? "success"
      : value === "IN_PROGRESS"
        ? "warning"
        : "danger";

  return <Badge variant={variant}>{formatOccurrenceStatus(value)}</Badge>;
}
