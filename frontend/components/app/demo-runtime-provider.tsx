"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import {
  ensureDemoState,
  startDemoEngine,
  subscribeToDemoUpdates,
} from "@/lib/demo-runtime";
import { isDemoRuntime } from "@/lib/runtime-config";

const LIVE_QUERY_KEYS = new Set([
  "dashboard-overview",
  "dashboard-overview-topbar",
  "dashboard-overview-occurrences",
  "containers",
  "ships",
  "tracking",
  "occurrences",
  "occurrences-summary",
  "simulation-runtime",
  "simulation-runtime-topbar",
  "simulation-ships",
  "simulation-containers",
  "control-tower-overview",
  "yard-operations-overview",
  "client-portal-overview",
  "client-portal-topbar",
  "reports-overview",
]);

export function DemoRuntimeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const throttleTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isDemoRuntime()) {
      return;
    }

    // Avoid running the autonomous engine on public pages to keep login responsive.
    if (pathname === "/" || pathname.startsWith("/login")) {
      return;
    }

    ensureDemoState();

    const stopEngine = startDemoEngine();
    const unsubscribe = subscribeToDemoUpdates(() => {
      if (throttleTimerRef.current !== null) {
        return;
      }

      throttleTimerRef.current = window.setTimeout(() => {
        throttleTimerRef.current = null;
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey[0];
            return typeof key === "string" && LIVE_QUERY_KEYS.has(key);
          },
          refetchType: "active",
        });
      }, 700);
    });

    return () => {
      unsubscribe();
      stopEngine();

      if (throttleTimerRef.current !== null) {
        window.clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
    };
  }, [pathname, queryClient]);

  return <>{children}</>;
}
