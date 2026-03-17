"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Anchor, ArrowRight, Container, ShieldCheck, Ship } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { demoCredentials } from "@/lib/auth";
import { useAuth } from "@/components/app/auth-provider";
import { getErrorMessage } from "@/services/api-client";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, login } = useAuth();
  const [email, setEmail] = useState(demoCredentials.email);
  const [password, setPassword] = useState(demoCredentials.password);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(searchParams.get("next") || "/dashboard");
    }
  }, [isAuthenticated, router, searchParams]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await login(email, password);
      toast.success("Ambiente PortFlow liberado.");
      router.replace(searchParams.get("next") || "/dashboard");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="grid-surface relative hidden overflow-hidden border-r border-white/60 px-8 py-10 lg:grid">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(11,79,108,0.16),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(238,108,77,0.16),transparent_26%)]" />
        <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col justify-between">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-primary/15 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              PortFlow
            </span>
            <div className="space-y-4">
              <h1 className="font-display text-5xl font-semibold tracking-tight text-foreground">
                Controle portuário com visão operacional de ponta a ponta.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-muted-foreground">
                Plataforma de gestão logística para pátio portuário, fiscalização aduaneira, expedição rodoviária e entrega final.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <FeatureCard
              icon={Ship}
              title="Escalas e ETA"
              text="Acompanhe navios previstos, atracação e descarga em tempo real."
            />
            <FeatureCard
              icon={Container}
              title="Contêineres"
              text="Monitore status, vínculos, histórico e gargalos operacionais."
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Compliance"
              text="Simule liberação alfandegária e transição segura entre etapas."
            />
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10">
        <Card className="w-full max-w-xl bg-white/92">
          <CardContent className="grid gap-8 p-8 sm:p-10">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
                  <Anchor className="size-5" />
                </div>
                <div>
                  <p className="font-display text-2xl font-semibold">Acessar PortFlow</p>
                  <p className="text-sm text-muted-foreground">
                    Ambiente demonstrativo para gestão logística portuária.
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-primary/10 bg-primary/6 p-4 text-sm text-muted-foreground">
                Use <strong>{demoCredentials.email}</strong> e{" "}
                <strong>{demoCredentials.password}</strong>.
              </div>
            </div>

            <form className="grid gap-5" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <Button className="mt-2" size="lg" type="submit" disabled={submitting}>
                {submitting ? "Entrando..." : "Entrar no controle operacional"}
                <ArrowRight className="size-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Ship;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/75 bg-white/80 p-5 soft-shadow">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}
