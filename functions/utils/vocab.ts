import type {
  AiEnrichment,
  VocabItem,
  VocabPayload,
  UpdateVocabItemInput
} from "../../shared/types";
import type { VocabAiEnrichmentRow, VocabRow } from "../types";
import { computeSmartScore } from "./enrichment";

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

export function normalizePhraseKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[“”"'`]/g, "")
    .replace(/[.,!?;:()[\]{}]/g, " ")
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getNormalizedPhrase(value: string) {
  return normalizePhraseKey(value);
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
    favorite?: boolean;
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

  if ("favorite" in input) {
    if (typeof input.favorite !== "boolean") {
      return { error: "Invalid favorite value" as const };
    }
    next.favorite = input.favorite;
  }

  return { value: next };
}

export function serializeList(value: string[]) {
  return JSON.stringify(value);
}

export function toAiEnrichment(row: VocabAiEnrichmentRow): AiEnrichment {
  return {
    item_id: row.item_id,
    normalized_phrase: row.normalized_phrase,
    suggested_correction: row.suggested_correction,
    correction_notes: row.correction_notes,
    suggested_meaning: row.suggested_meaning,
    suggested_group_label: row.suggested_group_label,
    suggested_word_type: row.suggested_word_type,
    suggested_synonyms: parseJsonList(row.suggested_synonyms),
    suggested_antonyms: parseJsonList(row.suggested_antonyms),
    suggested_example_sentence: row.suggested_example_sentence,
    suggested_example_context: row.suggested_example_context,
    usage_intent: row.usage_intent,
    difficulty: row.difficulty,
    review_priority: row.review_priority,
    confidence: row.confidence,
    suggestion_source: row.suggestion_source,
    suggested_at: row.suggested_at,
    accepted_at: row.accepted_at
  };
}

export async function insertVocabItem(
  db: D1Database,
  input: {
    phrase_text: string;
    note: string | null;
    tags: string[];
    source: string | null;
    meaning: string | null;
    synonyms: string[];
    group_label: string | null;
    review_status: "new" | "learning" | "mastered";
    favorite?: boolean;
  }
) {
  const now = new Date().toISOString();
  const result = await db
    .prepare(
      `INSERT INTO vocab_items (
        phrase_text,
        normalized_phrase,
        note,
        tags,
        source,
        meaning,
        synonyms,
        group_label,
        review_status,
        favorite,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      input.phrase_text,
      getNormalizedPhrase(input.phrase_text),
      input.note,
      serializeList(input.tags),
      input.source,
      input.meaning,
      serializeList(input.synonyms),
      input.group_label,
      input.review_status,
      input.favorite ? 1 : 0,
      now,
      now
    )
    .run();

  return db
    .prepare(`SELECT * FROM vocab_items WHERE id = ?`)
    .bind(result.meta.last_row_id)
    .first<VocabRow>();
}

export async function hasExistingPhrase(db: D1Database, phraseText: string) {
  const existing = await findExistingPhrase(db, phraseText);
  return Boolean(existing);
}

export async function findExistingPhrase(db: D1Database, phraseText: string) {
  const target = normalizePhraseKey(phraseText);
  const existing = await db
    .prepare(
      `SELECT * FROM vocab_items
        WHERE normalized_phrase = ?
           OR (normalized_phrase IS NULL AND phrase_text = ?)
        ORDER BY id ASC
        LIMIT 1`
    )
    .bind(target, phraseText)
    .first<VocabRow>();

  if (existing) {
    return existing;
  }

  const rows = await db
    .prepare(`SELECT * FROM vocab_items WHERE normalized_phrase IS NULL`)
    .all<VocabRow>();

  return (rows.results ?? []).find(
    (row) => normalizePhraseKey(row.phrase_text) === target
  ) ?? null;
}

export async function getEnrichmentMap(db: D1Database, itemIds: number[]) {
  if (!itemIds.length) {
    return new Map<number, VocabAiEnrichmentRow>();
  }

  const result = new Map<number, VocabAiEnrichmentRow>();
  const chunkSize = 50;

  for (let index = 0; index < itemIds.length; index += chunkSize) {
    const chunk = itemIds.slice(index, index + chunkSize);
    const placeholders = chunk.map(() => "?").join(", ");
    const rows = await db
      .prepare(`SELECT * FROM vocab_ai_enrichment WHERE item_id IN (${placeholders})`)
      .bind(...chunk)
      .all<VocabAiEnrichmentRow>();

    for (const row of rows.results ?? []) {
      result.set(row.item_id, row);
    }
  }

  return result;
}

export async function getItemWithEnrichment(db: D1Database, id: number) {
  const row = await db
    .prepare(`SELECT * FROM vocab_items WHERE id = ?`)
    .bind(id)
    .first<VocabRow>();

  if (!row) {
    return null;
  }

  const enrichment = await db
    .prepare(`SELECT * FROM vocab_ai_enrichment WHERE item_id = ?`)
    .bind(id)
    .first<VocabAiEnrichmentRow>();

  return toVocabItem(row, enrichment ?? null);
}

export function toVocabItem(
  row: VocabRow,
  enrichmentRow?: VocabAiEnrichmentRow | null
): VocabItem {
  const ai_enrichment = enrichmentRow ? toAiEnrichment(enrichmentRow) : null;
  const base = {
    id: row.id,
    phrase_text: row.phrase_text,
    note: row.note,
    tags: parseJsonList(row.tags),
    source: row.source,
    meaning: row.meaning,
    synonyms: parseJsonList(row.synonyms),
    group_label: row.group_label,
    review_status: row.review_status,
    favorite: Boolean(row.favorite),
    created_at: row.created_at,
    updated_at: row.updated_at
  };

  return {
    ...base,
    ai_enrichment,
    smart_score: computeSmartScore(
      {
        ...base,
        ai_enrichment: null,
        smart_score: 0
      },
      ai_enrichment
    )
  };
}
