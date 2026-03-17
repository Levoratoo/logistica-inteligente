import type { DemoScenario, DemoSpeed } from "@/lib/demo-runtime";
import {
  advanceSimulationCycle,
  getSimulationRuntimeState,
  restartSimulation,
  setSimulationRunning,
  setSimulationScenario,
  setSimulationSpeed,
  simulateDemoCustomsRelease,
  simulateDemoDelivery,
  simulateDemoDispatch,
  simulateDemoShipArrival,
} from "@/lib/demo-runtime";
import { isDemoRuntime } from "@/lib/runtime-config";
import type { Container, Ship } from "@/types/api";
import { apiClient } from "./api-client";

export async function simulateShipArrival(shipId: string) {
  if (isDemoRuntime()) {
    return simulateDemoShipArrival(shipId);
  }

  const { data } = await apiClient.post<Ship>(`/simulations/ships/${shipId}/arrival`);
  return data;
}

export async function simulateCustomsRelease(containerId: string) {
  if (isDemoRuntime()) {
    return simulateDemoCustomsRelease(containerId);
  }

  const { data } = await apiClient.post<Container>(
    `/simulations/containers/${containerId}/customs-release`,
  );
  return data;
}

export async function simulateDispatch(containerId: string) {
  if (isDemoRuntime()) {
    return simulateDemoDispatch(containerId);
  }

  const { data } = await apiClient.post<Container>(
    `/simulations/containers/${containerId}/dispatch`,
  );
  return data;
}

export async function simulateDelivery(containerId: string) {
  if (isDemoRuntime()) {
    return simulateDemoDelivery(containerId);
  }

  const { data } = await apiClient.post<Container>(
    `/simulations/containers/${containerId}/delivery`,
  );
  return data;
}

export async function getSimulationRuntime() {
  return getSimulationRuntimeState();
}

export async function updateSimulationScenario(scenario: DemoScenario) {
  setSimulationScenario(scenario);
  return getSimulationRuntimeState();
}

export async function updateSimulationSpeed(speed: DemoSpeed) {
  setSimulationSpeed(speed);
  return getSimulationRuntimeState();
}

export async function updateSimulationRunning(isRunning: boolean) {
  setSimulationRunning(isRunning);
  return getSimulationRuntimeState();
}

export async function runSimulationCycle(amount = 1) {
  advanceSimulationCycle(amount);
  return getSimulationRuntimeState();
}

export async function resetSimulationDemo() {
  restartSimulation();
  return getSimulationRuntimeState();
}
