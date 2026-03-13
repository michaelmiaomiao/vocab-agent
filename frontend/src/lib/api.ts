import type {
  BulkCreateResponse,
  DeleteByDateResponse,
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
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as { error?: string; message?: string };
      throw new Error(payload.error || payload.message || "Request failed");
    }

    const message = await response.text();
    const compact = message
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 220);
    throw new Error(compact || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function listVocab(status?: ReviewStatus | "all") {
  const query = status && status !== "all" ? `status=${status}` : "";
  const suffix = query ? `?${query}` : "";
  return request<VocabListResponse>(`/api/vocab/list${suffix}`);
}

export function listVocabSorted(
  status: ReviewStatus | "all" | undefined,
  sort: "newest" | "smart"
) {
  const params = new URLSearchParams();
  if (status && status !== "all") {
    params.set("status", status);
  }
  params.set("sort", sort);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return request<VocabListResponse>(`/api/vocab/list${suffix}`);
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

export function deleteVocabByDate(payload: { start_at: string; end_at: string }) {
  return request<DeleteByDateResponse>("/api/vocab/delete-by-date", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function bulkCreateVocab(rawText: string) {
  return request<BulkCreateResponse>("/api/vocab/bulk-create", {
    method: "POST",
    body: JSON.stringify({ raw_text: rawText })
  });
}

export function enrichVocabItem(id: number) {
  return request<VocabItem>(`/api/vocab/${id}/enrich`, {
    method: "POST"
  });
}

export function mergeVocabItem(
  id: number,
  payload: { target: string }
) {
  return request<VocabItem>(`/api/vocab/${id}/merge`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function applyAiSuggestion(id: number) {
  return request<VocabItem>(`/api/vocab/${id}/apply-ai`, {
    method: "POST"
  });
}
