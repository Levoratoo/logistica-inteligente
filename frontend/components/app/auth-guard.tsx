"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { canAccessPath, resolveAuthorizedPath } from "@/lib/auth";
import { useAuth } from "./auth-provider";

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  useEffect(() => {
    if (!isLoading && user && !canAccessPath(user, pathname)) {
      router.replace(resolveAuthorizedPath(user, null));
    }
  }, [isLoading, pathname, router, user]);

  if (isLoading || !isAuthenticated || (user && !canAccessPath(user, pathname))) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="rounded-3xl border border-white/80 bg-white/85 px-8 py-6 text-sm text-muted-foreground soft-shadow">
          Carregando ambiente PortFlow...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
