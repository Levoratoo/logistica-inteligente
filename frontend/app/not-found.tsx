import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="grid w-full max-w-xl gap-6 rounded-3xl border border-white/80 bg-white/92 p-8 soft-shadow">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
          <Search className="size-5" />
        </div>
        <div className="space-y-2">
          <p className="font-display text-4xl font-semibold">404</p>
          <p className="text-lg font-semibold">Pagina nao encontrada</p>
          <p className="text-sm text-muted-foreground">
            O endereco informado nao corresponde a uma rota ativa no PortFlow. Retorne ao ponto inicial.
          </p>
        </div>
        <Button asChild>
          <Link href="/">
            <ArrowLeft className="size-4" />
            Voltar ao inicio
          </Link>
        </Button>
      </div>
    </div>
  );
}

