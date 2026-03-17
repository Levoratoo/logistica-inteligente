"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Anchor, ArrowRight, Building2, UserRound } from "lucide-react";
import { getSessionHomePath, readSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const session = readSession();
    router.replace(session ? getSessionHomePath(session) : "/login");
  }, [router]);

  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,rgba(11,79,108,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(238,108,77,0.12),transparent_26%),linear-gradient(180deg,#f7fbfd_0%,#eef4f6_100%)] px-4 py-10">
      <Card className="w-full max-w-3xl border-white/70 bg-white/92 shadow-2xl shadow-slate-900/10">
        <CardContent className="grid gap-8 p-8 sm:p-10">
          <div className="space-y-4">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Anchor className="size-6" />
            </div>
            <div className="space-y-3">
              <span className="inline-flex rounded-full border border-primary/15 bg-primary/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-primary">
                PortFlow
              </span>
              <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
                Preparando o ambiente logistico.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                O sistema tenta redirecionar automaticamente para o painel correto. Se isso nao acontecer em alguns segundos, voce pode entrar manualmente pelo login demonstrativo.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[28px] border border-border/80 bg-slate-50/80 p-5">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Building2 className="size-5" />
              </div>
              <p className="font-display text-lg font-semibold">Equipe PortFlow</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Painel interno com operacao de patio, torre de controle, documentos e simulacao autonoma.
              </p>
            </div>
            <div className="rounded-[28px] border border-border/80 bg-slate-50/80 p-5">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UserRound className="size-5" />
              </div>
              <p className="font-display text-lg font-semibold">Portal do cliente</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Acesso externo com visao filtrada por conta, entregas, documentos e ocorrencias.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="sm:min-w-56">
              <Link href="/login">
                Continuar
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="sm:min-w-56">
              <Link href="/login">Abrir login demonstrativo</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
