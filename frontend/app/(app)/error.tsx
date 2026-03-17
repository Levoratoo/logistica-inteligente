"use client";

import { ArrowRight, Home, RefreshCw, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: AppErrorProps) {
  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="grid w-full max-w-xl gap-6 rounded-3xl border border-white/80 bg-white/92 p-8 soft-shadow">
        <div className="grid gap-4">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <ShieldAlert className="size-5" />
          </span>
          <h1 className="font-display text-2xl font-semibold">Falha de renderizacao em modulo interno</h1>
          <p className="text-sm text-muted-foreground">
            Houve um erro nesta secao. Você pode recarregar o módulo ou voltar para a raiz.
          </p>
          <p className="rounded-[20px] border border-rose-100 bg-rose-50 px-4 py-3 text-xs text-rose-700">
            {error.message}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => reset()}>
            <RefreshCw className="size-4" />
            Recarregar modulo
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              <Home className="size-4" />
              Dashboard
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/login">
              <ArrowRight className="size-4" />
              Login
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

