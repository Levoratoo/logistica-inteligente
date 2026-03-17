import type { EventLog, PaginatedResponse } from "@/types/api";
import { getDemoContainerEvents, listDemoEvents } from "@/lib/demo-runtime";
import { isDemoRuntime } from "@/lib/runtime-config";
import { apiClient } from "./api-client";

export async function listEvents(params: {
  page: number;
  pageSize: number;
  type?: string;
  containerId?: string;
}) {
  if (isDemoRuntime()) {
    return listDemoEvents(params);
  }

  const { data } = await apiClient.get<PaginatedResponse<EventLog>>("/events", {
    params,
  });
  return data;
}

export async function getContainerEvents(containerId: string) {
  if (isDemoRuntime()) {
    return getDemoContainerEvents(containerId);
  }

  const { data } = await apiClient.get<EventLog[]>(`/events/container/${containerId}`);
  return data;
}
