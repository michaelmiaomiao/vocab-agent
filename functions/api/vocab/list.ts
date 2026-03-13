import type { PagesFunction } from "@cloudflare/workers-types";
import type { Env, VocabRow } from "../../types";
import { error, json } from "../../utils/http";
import { toVocabItem } from "../../utils/vocab";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const status = url.searchParams.get("status");

  if (status && !["new", "learning", "mastered"].includes(status)) {
    return error("Invalid status filter");
  }

  const query = status
    ? `SELECT * FROM vocab_items WHERE review_status = ? ORDER BY created_at DESC`
    : `SELECT * FROM vocab_items ORDER BY created_at DESC`;

  const statement = context.env.DB.prepare(query);
  const rows = status
    ? await statement.bind(status).all<VocabRow>()
    : await statement.all<VocabRow>();

  return json({
    items: (rows.results ?? []).map(toVocabItem)
  });
};
