import type {
  Container,
  ContainerPayload,
  PaginatedResponse,
} from "@/types/api";
import {
  createDemoContainer,
  deleteDemoContainer,
  getDemoContainer,
  listDemoContainers,
  trackDemoContainer,
  updateDemoContainer,
} from "@/lib/demo-runtime";
import { isDemoRuntime } from "@/lib/runtime-config";
import { apiClient } from "./api-client";

export type ContainerFilters = {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  origin?: string;
  destination?: string;
  shipId?: string;
  carrierId?: string;
};

export async function listContainers(filters: ContainerFilters) {
  if (isDemoRuntime()) {
    return listDemoContainers(filters);
  }

  const { data } = await apiClient.get<PaginatedResponse<Container>>("/containers", {
    params: filters,
  });
  return data;
}

export async function getContainer(id: string) {
  if (isDemoRuntime()) {
    return getDemoContainer(id);
  }

  const { data } = await apiClient.get<Container>(`/containers/${id}`);
  return data;
}

export async function trackContainer(containerCode: string) {
  if (isDemoRuntime()) {
    return trackDemoContainer(containerCode);
  }

  const { data } = await apiClient.get<Container>(
    `/containers/tracking/${containerCode}`,
  );
  return data;
}

export async function createContainer(payload: ContainerPayload) {
  if (isDemoRuntime()) {
    return createDemoContainer(payload);
  }

  const { data } = await apiClient.post<Container>("/containers", payload);
  return data;
}

export async function updateContainer(id: string, payload: Partial<ContainerPayload>) {
  if (isDemoRuntime()) {
    return updateDemoContainer(id, payload);
  }

  const { data } = await apiClient.patch<Container>(`/containers/${id}`, payload);
  return data;
}

export async function deleteContainer(id: string) {
  if (isDemoRuntime()) {
    return deleteDemoContainer(id);
  }

  const { data } = await apiClient.delete<{ success: boolean }>(`/containers/${id}`);
  return data;
}
