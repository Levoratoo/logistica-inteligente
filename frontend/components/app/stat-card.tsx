import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  title,
  value,
  helper,
  icon: Icon,
}: {
  title: string;
  value: string;
  helper: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/7 via-transparent to-accent/6" />
      <CardContent className="relative grid gap-4 p-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <Icon className="size-5" />
          </div>
        </div>
        <div className="space-y-1">
          <strong className="font-display text-3xl font-semibold tracking-tight">
            {value}
          </strong>
          <p className="text-sm text-muted-foreground">{helper}</p>
        </div>
      </CardContent>
    </Card>
  );
}
