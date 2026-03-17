import { Button } from "@/components/ui/button";
import type { PaginationMeta } from "@/types/api";

export function PaginationControls({
  meta,
  onPrevious,
  onNext,
}: {
  meta?: PaginationMeta;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (!meta) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-white/75 px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        Página {meta.page} de {meta.totalPages} · {meta.total} registros
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevious}
          disabled={meta.page <= 1}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={meta.page >= meta.totalPages}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}
