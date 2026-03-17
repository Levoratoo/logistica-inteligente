import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-3">
        <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-primary uppercase">
          {eyebrow}
        </span>
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
            {title}
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground lg:text-base">
            {description}
          </p>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
