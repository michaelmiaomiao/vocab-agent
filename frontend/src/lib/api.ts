import type {
  ReviewStatus,
  UpdateVocabItemInput,
  VocabItem,
  VocabListResponse,
  VocabPayload
} from "@shared/types";

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function listVocab(status?: ReviewStatus | "all") {
  const query = status && status !== "all" ? `?status=${status}` : "";
  return request<VocabListResponse>(`/api/vocab/list${query}`);
}

export function createVocabItem(payload: VocabPayload) {
  return request<VocabItem>("/api/vocab/create", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getVocabItem(id: number) {
  return request<VocabItem>(`/api/vocab/${id}`);
}

export function updateVocabItem(id: number, payload: UpdateVocabItemInput) {
  return request<VocabItem>(`/api/vocab/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteVocabItem(id: number) {
  return request<void>(`/api/vocab/${id}`, {
    method: "DELETE"
  });
}
