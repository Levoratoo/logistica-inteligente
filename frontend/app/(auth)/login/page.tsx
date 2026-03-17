"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Anchor,
  ArrowRight,
  Building2,
  Container,
  ShieldCheck,
  Ship,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  demoAccessProfiles,
  resolveAuthorizedPath,
  type DemoAccessProfile,
} from "@/lib/auth";
import { useAuth } from "@/components/app/auth-provider";
import { getErrorMessage } from "@/services/api-client";

const defaultProfile = demoAccessProfiles[0];

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
  const { isAuthenticated, login, user } = useAuth();
  const [selectedProfileId, setSelectedProfileId] = useState(defaultProfile.id);
  const [email, setEmail] = useState(defaultProfile.email);
  const [password, setPassword] = useState(defaultProfile.password);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      router.replace(resolveAuthorizedPath(user, searchParams.get("next")));
    }
  }, [isAuthenticated, router, searchParams, user]);

  function applyProfile(profile: DemoAccessProfile) {
    setSelectedProfileId(profile.id);
    setEmail(profile.email);
    setPassword(profile.password);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const nextUser = await login(email, password);
      toast.success(
        nextUser.accountType === "CLIENT"
          ? "Portal do cliente liberado."
          : "Ambiente PortFlow liberado.",
      );
      router.replace(resolveAuthorizedPath(nextUser, searchParams.get("next")));
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
                Operacao portuaria para a empresa e visibilidade sob medida para o cliente.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-muted-foreground">
                Entre como equipe PortFlow para operar patio, docas e documentos, ou use o perfil de cliente para acompanhar apenas as cargas da sua conta.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <FeatureCard
              icon={Ship}
              title="Escalas e ETA"
              text="Acompanhe navios previstos, atracacao, descarga e pressao no terminal."
            />
            <FeatureCard
              icon={Container}
              title="Fluxo do conteiner"
              text="Visualize documentos, bloqueios operacionais e marcos de entrega."
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Dois perfis"
              text="Empresa com controle completo e cliente com portal externo filtrado."
            />
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10">
        <Card className="w-full max-w-2xl bg-white/92">
          <CardContent className="grid gap-8 p-8 sm:p-10">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
                  <Anchor className="size-5" />
                </div>
                <div>
                  <p className="font-display text-2xl font-semibold">Acessar PortFlow</p>
                  <p className="text-sm text-muted-foreground">
                    Escolha um dos acessos demonstrativos abaixo.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {demoAccessProfiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => applyProfile(profile)}
                  className={[
                    "rounded-[28px] border p-5 text-left transition",
                    selectedProfileId === profile.id
                      ? "border-primary bg-primary/6 shadow-lg shadow-primary/10"
                      : "border-border bg-white/75 hover:border-primary/25 hover:bg-white",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-xl font-semibold">{profile.label}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {profile.description}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-secondary/70 p-3 text-primary">
                      {profile.user.accountType === "COMPANY" ? (
                        <Building2 className="size-5" />
                      ) : (
                        <UserRound className="size-5" />
                      )}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-1 text-sm">
                    <span>
                      <strong>Email:</strong> {profile.email}
                    </span>
                    <span>
                      <strong>Senha:</strong> {profile.password}
                    </span>
                  </div>
                </button>
              ))}
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
                {submitting ? "Entrando..." : "Entrar no PortFlow"}
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
