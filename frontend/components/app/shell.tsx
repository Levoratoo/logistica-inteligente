import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto grid min-h-screen max-w-[1680px] gap-6 px-4 py-6 lg:grid-cols-[290px_minmax(0,1fr)] lg:px-6">
      <Sidebar />
      <div className="grid gap-6">
        <Topbar />
        <main className="page-fade grid gap-6">{children}</main>
      </div>
    </div>
  );
}
