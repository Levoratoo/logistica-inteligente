"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ensureDemoState,
  startDemoEngine,
  subscribeToDemoUpdates,
} from "@/lib/demo-runtime";
import { isDemoRuntime } from "@/lib/runtime-config";

export function DemoRuntimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isDemoRuntime()) {
      return;
    }

    ensureDemoState();

    const stopEngine = startDemoEngine();
    const unsubscribe = subscribeToDemoUpdates(() => {
      queryClient.refetchQueries({ type: "active" });
    });

    return () => {
      unsubscribe();
      stopEngine();
    };
  }, [queryClient]);

  return <>{children}</>;
}
