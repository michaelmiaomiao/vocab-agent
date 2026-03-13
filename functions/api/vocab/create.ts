import type { PagesFunction } from "@cloudflare/workers-types";
import type { Env, VocabRow } from "../../types";
import { error, json } from "../../utils/http";
import { sanitizeCreatePayload, serializeList, toVocabItem } from "../../utils/vocab";

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: unknown;

  try {
    body = await context.request.json();
  } catch {
    return error("Invalid JSON body");
  }

  const parsed = sanitizeCreatePayload((body ?? {}) as Record<string, unknown>);

  if ("error" in parsed) {
    return error(parsed.error);
  }

  const now = new Date().toISOString();
  const result = await context.env.DB.prepare(
    `INSERT INTO vocab_items (
      phrase_text,
      note,
      tags,
      source,
      meaning,
      synonyms,
      group_label,
      review_status,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      parsed.value.phrase_text,
      parsed.value.note,
      serializeList(parsed.value.tags),
      parsed.value.source,
      parsed.value.meaning,
      serializeList(parsed.value.synonyms),
      parsed.value.group_label,
      parsed.value.review_status,
      now,
      now
    )
    .run();

  const row = await context.env.DB.prepare(
    `SELECT * FROM vocab_items WHERE id = ?`
  )
    .bind(result.meta.last_row_id)
    .first<VocabRow>();

  if (!row) {
    return error("Failed to fetch created item", 500);
  }

  return json(toVocabItem(row), 201);
};
