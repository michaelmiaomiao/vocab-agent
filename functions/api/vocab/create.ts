import type { AppPagesFunction } from "../../types";
import { error, json } from "../../utils/http";
import {
  findExistingPhrase,
  insertVocabItem,
  sanitizeCreatePayload,
  toVocabItem
} from "../../utils/vocab";

export const onRequestPost: AppPagesFunction = async (context) => {
  let body: unknown;

  try {
    body = await context.request.json();
  } catch {
    return error("Invalid JSON body");
  }

  const parsed = sanitizeCreatePayload((body ?? {}) as Record<string, unknown>);

  if ("error" in parsed && parsed.error) {
    return error(parsed.error);
  }

  const existing = await findExistingPhrase(context.env.DB, parsed.value.phrase_text);
  if (existing) {
    return json(toVocabItem(existing, null), 200);
  }

  const row = await insertVocabItem(context.env.DB, parsed.value);

  if (!row) {
    return error("Failed to fetch created item", 500);
  }

  return json(toVocabItem(row, null), 201);
};
