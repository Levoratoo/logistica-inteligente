import type {
  ClientPortalOverview,
  Container,
  EventLog,
  OperationalOccurrence,
} from "@/types/api";
import { listContainers } from "./containers-service";
import { listOccurrences } from "./occurrences-service";
import { getSimulationRuntime } from "./simulations-service";

function compareByDate(left?: string | null, right?: string | null) {
  return new Date(right ?? 0).getTime() - new Date(left ?? 0).getTime();
}

function filterContainersByClient(containers: Container[], clientName: string) {
  return containers.filter((container) => container.clientName === clientName);
}

function sortActiveShipments(containers: Container[]) {
  return [...containers].sort((left, right) => {
    const leftDelivered = left.status === "ENTREGUE" ? 1 : 0;
    const rightDelivered = right.status === "ENTREGUE" ? 1 : 0;

    if (leftDelivered !== rightDelivered) {
      return leftDelivered - rightDelivered;
    }

    return compareByDate(left.updatedAt, right.updatedAt);
  });
}

export async function getClientPortalOverview(
  clientName: string,
): Promise<ClientPortalOverview> {
  const [runtime, containerResponse, occurrenceResponse] = await Promise.all([
    getSimulationRuntime(),
    listContainers({ page: 1, pageSize: 100 }),
    listOccurrences({ page: 1, pageSize: 200 }),
  ]);

  const shipments = sortActiveShipments(filterContainersByClient(containerResponse.data, clientName));
  const shipmentIds = new Set(shipments.map((container) => container.id));
  const openIssues = occurrenceResponse.data
    .filter(
      (occurrence) =>
        occurrence.status !== "RESOLVED" &&
        occurrence.container?.clientName === clientName &&
        shipmentIds.has(occurrence.container.id),
    )
    .sort((left, right) => compareByDate(left.updatedAt, right.updatedAt))
    .slice(0, 5);
  const recentMilestones = shipments
    .flatMap((container) => container.events ?? [])
    .sort((left, right) => compareByDate(left.occurredAt, right.occurredAt))
    .slice(0, 8);
  const documentAlerts = shipments
    .filter((container) => (container.documentWorkflow?.blockedStages.length ?? 0) > 0)
    .sort((left, right) => compareByDate(left.updatedAt, right.updatedAt))
    .slice(0, 5);
  const upcomingDeliveries = shipments
    .filter((container) => container.status !== "ENTREGUE")
    .sort((left, right) => new Date(left.eta ?? 0).getTime() - new Date(right.eta ?? 0).getTime())
    .slice(0, 5);

  return {
    clientName,
    currentTime: runtime.currentTime,
    kpis: {
      activeContainers: shipments.filter((container) => container.status !== "ENTREGUE").length,
      inTransit: shipments.filter((container) => container.status === "EM_TRANSPORTE").length,
      delivered: shipments.filter((container) => container.status === "ENTREGUE").length,
      pendingDocuments: shipments.filter(
        (container) => (container.documentWorkflow?.blockedStages.length ?? 0) > 0,
      ).length,
      openOccurrences: openIssues.length,
    },
    shipments: shipments.slice(0, 8),
    upcomingDeliveries,
    documentAlerts,
    recentMilestones: recentMilestones.map((event) => ({
      ...event,
      container: event.container,
    })) as EventLog[],
    openIssues: openIssues.map((occurrence) => ({
      ...occurrence,
      container: occurrence.container,
    })) as OperationalOccurrence[],
  };
}
