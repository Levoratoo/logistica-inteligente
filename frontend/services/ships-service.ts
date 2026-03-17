import type { PaginatedResponse, Ship, ShipPayload } from "@/types/api";
import {
  createDemoShip,
  deleteDemoShip,
  getDemoShip,
  listDemoShips,
  updateDemoShip,
} from "@/lib/demo-runtime";
import { isDemoRuntime } from "@/lib/runtime-config";
import { apiClient } from "./api-client";

export type ShipFilters = {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  origin?: string;
  destination?: string;
};

export async function listShips(filters: ShipFilters) {
  if (isDemoRuntime()) {
    return listDemoShips(filters);
  }

  const { data } = await apiClient.get<PaginatedResponse<Ship>>("/ships", {
    params: filters,
  });
  return data;
}

export async function getShip(id: string) {
  if (isDemoRuntime()) {
    return getDemoShip(id);
  }

  const { data } = await apiClient.get<Ship>(`/ships/${id}`);
  return data;
}

export async function createShip(payload: ShipPayload) {
  if (isDemoRuntime()) {
    return createDemoShip(payload);
  }

  const { data } = await apiClient.post<Ship>("/ships", payload);
  return data;
}

export async function updateShip(id: string, payload: Partial<ShipPayload>) {
  if (isDemoRuntime()) {
    return updateDemoShip(id, payload);
  }

  const { data } = await apiClient.patch<Ship>(`/ships/${id}`, payload);
  return data;
}

export async function deleteShip(id: string) {
  if (isDemoRuntime()) {
    return deleteDemoShip(id);
  }

  const { data } = await apiClient.delete<{ success: boolean }>(`/ships/${id}`);
  return data;
}
