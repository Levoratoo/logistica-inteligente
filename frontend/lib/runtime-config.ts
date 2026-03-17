export type FrontendRuntimeMode = "demo" | "api";

export function getFrontendRuntimeMode(): FrontendRuntimeMode {
  return process.env.NEXT_PUBLIC_RUNTIME_MODE === "api" ? "api" : "demo";
}

export function isDemoRuntime() {
  return getFrontendRuntimeMode() === "demo";
}

export function getBasePath() {
  return process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";
}
