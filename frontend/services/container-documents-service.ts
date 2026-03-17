import { isDemoRuntime } from "@/lib/runtime-config";
import {
  updateDemoContainerDocument,
  upsertDemoContainerDocument,
} from "@/lib/demo-runtime";
import type {
  Container,
  ContainerDocumentStage,
  ContainerDocumentStatus,
  ContainerDocumentType,
} from "@/types/api";

export async function updateContainerDocumentStatus(
  containerId: string,
  documentId: string,
  status: ContainerDocumentStatus,
  notes?: string,
  reviewedBy?: string,
) {
  if (isDemoRuntime()) {
    return updateDemoContainerDocument(containerId, documentId, status, notes, reviewedBy);
  }

  throw new Error("Workflow documental disponivel apenas no modo demo nesta versao.");
}

export async function ensureContainerDocument(
  containerId: string,
  type: ContainerDocumentType,
  stage: ContainerDocumentStage,
  status: ContainerDocumentStatus,
  reviewedBy?: string,
) {
  if (isDemoRuntime()) {
    return upsertDemoContainerDocument(containerId, type, stage, status, reviewedBy);
  }

  throw new Error("Workflow documental disponivel apenas no modo demo nesta versao.");
}

export type DocumentMutationResult = Container;
