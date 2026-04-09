import type { AppPagesFunction, Env, VocabRow } from "../../types";
import { error, json } from "../../utils/http";
import {
  getNormalizedPhrase,
  getItemWithEnrichment,
  sanitizeUpdatePayload,
  serializeList,
  toVocabItem
} from "../../utils/vocab";

interface RouteContext {
  env: Env;
  params: {
    id: string;
  };
}

type LoadedItem =
  | {
      errorResponse: Response;
    }
  | {
      id: number;
      row: VocabRow;
    };

async function loadItem(context: RouteContext): Promise<LoadedItem> {
  const id = Number(context.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return { errorResponse: error("Invalid id") };
  }

  const row = await context.env.DB.prepare(`SELECT * FROM vocab_items WHERE id = ?`)
    .bind(id)
    .first<VocabRow>();

  if (!row) {
    return { errorResponse: error("Item not found", 404) };
  }

  return { id, row };
}

export const onRequestGet: AppPagesFunction = async (context) => {
  const loaded = await loadItem(context as unknown as RouteContext);
  if ("errorResponse" in loaded) return loaded.errorResponse;
  const item = await getItemWithEnrichment(context.env.DB, loaded.id);
  if (!item) return error("Item not found", 404);
  return json(item);
};

export const onRequestPatch: AppPagesFunction = async (context) => {
  const loaded = await loadItem(context as unknown as RouteContext);
  if ("errorResponse" in loaded) return loaded.errorResponse;

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return error("Invalid JSON body");
  }

  const parsed = sanitizeUpdatePayload(
    (body ?? {}) as Record<string, unknown>
  );

  if ("error" in parsed && parsed.error) {
    return error(parsed.error);
  }

  if (Object.keys(parsed.value).length === 0) {
    return error("No fields to update");
  }

  const nextTags =
    parsed.value.tags !== undefined ? serializeList(parsed.value.tags) : loaded.row.tags;
  const nextSynonyms =
    parsed.value.synonyms !== undefined
      ? serializeList(parsed.value.synonyms)
      : loaded.row.synonyms;

  await context.env.DB.prepare(
    `UPDATE vocab_items
      SET phrase_text = ?,
          normalized_phrase = ?,
          note = ?,
          tags = ?,
          source = ?,
          meaning = ?,
          synonyms = ?,
          group_label = ?,
          review_status = ?,
          favorite = ?,
          updated_at = ?
      WHERE id = ?`
  )
    .bind(
      parsed.value.phrase_text ?? loaded.row.phrase_text,
      getNormalizedPhrase(parsed.value.phrase_text ?? loaded.row.phrase_text),
      parsed.value.note !== undefined ? parsed.value.note : loaded.row.note,
      nextTags,
      parsed.value.source !== undefined ? parsed.value.source : loaded.row.source,
      parsed.value.meaning !== undefined ? parsed.value.meaning : loaded.row.meaning,
      nextSynonyms,
      parsed.value.group_label !== undefined
        ? parsed.value.group_label
        : loaded.row.group_label,
      parsed.value.review_status ?? loaded.row.review_status,
      parsed.value.favorite !== undefined
        ? Number(parsed.value.favorite)
        : loaded.row.favorite,
      new Date().toISOString(),
      loaded.id
    )
    .run();

  const updated = await context.env.DB.prepare(
    `SELECT * FROM vocab_items WHERE id = ?`
  )
    .bind(loaded.id)
    .first<VocabRow>();

  if (!updated) {
    return error("Failed to fetch updated item", 500);
  }

  const item = await getItemWithEnrichment(context.env.DB, loaded.id);
  if (!item) return error("Failed to fetch updated item", 500);
  return json(item);
};

export const onRequestDelete: AppPagesFunction = async (context) => {
  const loaded = await loadItem(context as unknown as RouteContext);
  if ("errorResponse" in loaded) return loaded.errorResponse;

  await context.env.DB.prepare(`DELETE FROM vocab_items WHERE id = ?`)
    .bind(loaded.id)
    .run();

  return new Response(null, { status: 204 });
};
