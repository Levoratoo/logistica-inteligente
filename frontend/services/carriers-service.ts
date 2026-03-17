import type { Carrier, CarrierPayload, PaginatedResponse } from "@/types/api";
import {
  createDemoCarrier,
  deleteDemoCarrier,
  getDemoCarrier,
  listDemoCarriers,
  updateDemoCarrier,
} from "@/lib/demo-runtime";
import { isDemoRuntime } from "@/lib/runtime-config";
import { apiClient } from "./api-client";

export type CarrierFilters = {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
};

export async function listCarriers(filters: CarrierFilters) {
  if (isDemoRuntime()) {
    return listDemoCarriers(filters);
  }

  const { data } = await apiClient.get<PaginatedResponse<Carrier>>("/carriers", {
    params: filters,
  });
  return data;
}

export async function getCarrier(id: string) {
  if (isDemoRuntime()) {
    return getDemoCarrier(id);
  }

  const { data } = await apiClient.get<Carrier>(`/carriers/${id}`);
  return data;
}

export async function createCarrier(payload: CarrierPayload) {
  if (isDemoRuntime()) {
    return createDemoCarrier(payload);
  }

  const { data } = await apiClient.post<Carrier>("/carriers", payload);
  return data;
}

export async function updateCarrier(id: string, payload: Partial<CarrierPayload>) {
  if (isDemoRuntime()) {
    return updateDemoCarrier(id, payload);
  }

  const { data } = await apiClient.patch<Carrier>(`/carriers/${id}`, payload);
  return data;
}

export async function deleteCarrier(id: string) {
  if (isDemoRuntime()) {
    return deleteDemoCarrier(id);
  }

  const { data } = await apiClient.delete<{ success: boolean }>(
    `/carriers/${id}`,
  );
  return data;
}
