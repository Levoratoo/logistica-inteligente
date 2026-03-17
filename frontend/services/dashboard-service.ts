import type { DashboardOverview } from "@/types/api";
import { getDemoDashboardOverview } from "@/lib/demo-runtime";
import { isDemoRuntime } from "@/lib/runtime-config";
import { apiClient } from "./api-client";

export async function getDashboardOverview() {
  if (isDemoRuntime()) {
    return getDemoDashboardOverview();
  }

  const { data } = await apiClient.get<DashboardOverview>("/dashboard");
  return data;
}
