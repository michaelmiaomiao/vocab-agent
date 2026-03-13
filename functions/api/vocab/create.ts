import type { PagesFunction } from "@cloudflare/workers-types";
import type { Env } from "../../types";
import { error, json } from "../../utils/http";
import {
  insertVocabItem,
  sanitizeCreatePayload,
  toVocabItem
} from "../../utils/vocab";

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

  const row = await insertVocabItem(context.env.DB, parsed.value);

  if (!row) {
    return error("Failed to fetch created item", 500);
  }

  return json(toVocabItem(row, null), 201);
};
