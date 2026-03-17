import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/formatters";
import type { EventLog } from "@/types/api";
import { StatusBadge } from "./status-badge";

export function Timeline({
  events,
  title = "Timeline operacional",
}: {
  events: EventLog[];
  title?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-secondary/40 px-4 py-5 text-sm text-muted-foreground">
            Nenhum evento registrado até o momento.
          </div>
        ) : null}
        {events.map((event, index) => (
          <div key={event.id} className="relative flex gap-4 pl-4">
            {index < events.length - 1 ? (
              <span className="absolute top-7 left-[0.45rem] h-[calc(100%+0.75rem)] w-px bg-border" />
            ) : null}
            <span className="relative mt-1 h-3 w-3 rounded-full bg-primary ring-4 ring-primary/10" />
            <div className="flex-1 space-y-2 rounded-2xl border border-border/80 bg-white/80 p-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h4 className="font-semibold text-foreground">{event.title}</h4>
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                </div>
                <StatusBadge value={event.type} />
              </div>
              <div className="flex flex-wrap gap-4 text-xs font-medium text-muted-foreground">
                <span>{formatDateTime(event.occurredAt)}</span>
                {event.location ? <span>{event.location}</span> : null}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
