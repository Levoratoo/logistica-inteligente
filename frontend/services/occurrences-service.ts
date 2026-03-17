import {
  assignDemoOccurrence,
  getDemoOccurrence,
  listDemoOccurrences,
  updateDemoOccurrenceStatus,
} from "@/lib/demo-runtime";
import type { OccurrenceStatus } from "@/types/api";

export type OccurrenceFilters = {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  severity?: string;
  category?: string;
};

export async function listOccurrences(filters: OccurrenceFilters) {
  return listDemoOccurrences(filters);
}

export async function getOccurrence(occurrenceId: string) {
  return getDemoOccurrence(occurrenceId);
}

export async function assignOccurrence(occurrenceId: string, ownerName: string) {
  return assignDemoOccurrence(occurrenceId, ownerName);
}

export async function updateOccurrenceStatus(
  occurrenceId: string,
  status: OccurrenceStatus,
  note?: string,
) {
  return updateDemoOccurrenceStatus(occurrenceId, status, note);
}
