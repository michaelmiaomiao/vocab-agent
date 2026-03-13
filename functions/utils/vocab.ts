import type { VocabItem, VocabPayload, UpdateVocabItemInput } from "../../shared/types";
import type { VocabRow } from "../types";

export function parseJsonList(value: string | null): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch {
    return [];
  }
}

export function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function sanitizeCreatePayload(input: Partial<VocabPayload>) {
  const phraseText = normalizeOptionalText(input.phrase_text);

  if (!phraseText) {
    return { error: "phrase_text is required" as const };
  }

  return {
    value: {
      phrase_text: phraseText,
      note: normalizeOptionalText(input.note),
      tags: normalizeStringArray(input.tags),
      source: normalizeOptionalText(input.source),
      meaning: normalizeOptionalText(input.meaning),
      synonyms: normalizeStringArray(input.synonyms),
      group_label: normalizeOptionalText(input.group_label),
      review_status: "new" as const
    }
  };
}

export function sanitizeUpdatePayload(input: Partial<UpdateVocabItemInput>) {
  const next: {
    note?: string | null;
    phrase_text?: string;
    tags?: string[];
    source?: string | null;
    meaning?: string | null;
    synonyms?: string[];
    group_label?: string | null;
    review_status?: "new" | "learning" | "mastered";
  } = {};

  if ("phrase_text" in input) {
    const phraseText = normalizeOptionalText(input.phrase_text);
    if (!phraseText) {
      return { error: "phrase_text cannot be empty" as const };
    }
    next.phrase_text = phraseText;
  }

  if ("note" in input) next.note = normalizeOptionalText(input.note);
  if ("tags" in input) next.tags = normalizeStringArray(input.tags);
  if ("source" in input) next.source = normalizeOptionalText(input.source);
  if ("meaning" in input) next.meaning = normalizeOptionalText(input.meaning);
  if ("synonyms" in input) next.synonyms = normalizeStringArray(input.synonyms);
  if ("group_label" in input) next.group_label = normalizeOptionalText(input.group_label);

  if ("review_status" in input) {
    if (
      input.review_status !== "new" &&
      input.review_status !== "learning" &&
      input.review_status !== "mastered"
    ) {
      return { error: "Invalid review_status" as const };
    }
    next.review_status = input.review_status;
  }

  return { value: next };
}

export function serializeList(value: string[]) {
  return JSON.stringify(value);
}

export function toVocabItem(row: VocabRow): VocabItem {
  return {
    id: row.id,
    phrase_text: row.phrase_text,
    note: row.note,
    tags: parseJsonList(row.tags),
    source: row.source,
    meaning: row.meaning,
    synonyms: parseJsonList(row.synonyms),
    group_label: row.group_label,
    review_status: row.review_status,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
