import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api",
  timeout: 10000,
});

export function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ??
      error.message ??
      "Falha ao processar a solicitação."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Falha ao processar a solicitação.";
}
