"use client";

import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

type GlobalErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorPageProps) {
  useEffect(() => {
    console.error("Erro global PortFlow:", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,rgba(11,79,108,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(238,108,77,0.12),transparent_26%),linear-gradient(180deg,#f7fbfd_0%,#eef4f6_100%)] px-4">
        <div className="grid w-full max-w-3xl gap-6 rounded-3xl border border-white/80 bg-white/90 p-8 soft-shadow">
          <div className="space-y-2">
            <p className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-rose-600">
              Recuperacao de Erro
            </p>
            <h1 className="font-display text-3xl font-semibold">A sessão da aplicacao foi interrompida</h1>
            <p className="text-sm text-muted-foreground">
              Ocorreu uma falha não esperada. O sistema ainda pode recuperar e recarregar esse estado.
            </p>
            <p className="rounded-[20px] border border-rose-100 bg-rose-50/65 px-4 py-3 text-xs text-rose-700">
              Detalhe: {error.message}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => reset()}>
              <RefreshCw className="size-4" />
              Tentar novamente
            </Button>
            <Button variant="outline" asChild>
              <Link href="/login">
                <ArrowLeft className="size-4" />
                Voltar para login
              </Link>
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}

