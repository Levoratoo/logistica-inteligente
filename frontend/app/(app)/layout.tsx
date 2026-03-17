import type { ReactNode } from "react";
import { AuthGuard } from "@/components/app/auth-guard";
import { DemoRuntimeProvider } from "@/components/app/demo-runtime-provider";
import { AppShell } from "@/components/app/shell";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <DemoRuntimeProvider>
      <AuthGuard>
        <AppShell>{children}</AppShell>
      </AuthGuard>
    </DemoRuntimeProvider>
  );
}
