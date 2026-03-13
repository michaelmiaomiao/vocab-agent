import type { AppPagesFunction, VocabRow } from "../../types";
import { error, json } from "../../utils/http";
import { getEnrichmentMap, toVocabItem } from "../../utils/vocab";

export const onRequestGet: AppPagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const status = url.searchParams.get("status");
  const sort = url.searchParams.get("sort") ?? "newest";

  if (status && !["new", "learning", "mastered"].includes(status)) {
    return error("Invalid status filter");
  }

  if (!["newest", "smart"].includes(sort)) {
    return error("Invalid sort");
  }

  const query = status
    ? `SELECT * FROM vocab_items WHERE review_status = ? ORDER BY created_at DESC`
    : `SELECT * FROM vocab_items ORDER BY created_at DESC`;

  const statement = context.env.DB.prepare(query);
  const rows = status
    ? await statement.bind(status).all<VocabRow>()
    : await statement.all<VocabRow>();

  const items = rows.results ?? [];
  const enrichmentMap = await getEnrichmentMap(
    context.env.DB,
    items.map((row) => row.id)
  );
  const merged = items.map((row) => toVocabItem(row, enrichmentMap.get(row.id) ?? null));

  if (sort === "smart") {
    merged.sort((left, right) => right.smart_score - left.smart_score);
  }

  return json({
    items: merged
  });
};
