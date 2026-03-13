import type { PagesFunction } from "@cloudflare/workers-types";
import type { Env, VocabAiEnrichmentRow } from "../../../types";
import { error, json } from "../../../utils/http";
import { getItemWithEnrichment } from "../../../utils/vocab";

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const id = Number(context.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return error("Invalid id");
  }

  const enrichment = await context.env.DB.prepare(
    `SELECT * FROM vocab_ai_enrichment WHERE item_id = ?`
  )
    .bind(id)
    .first<VocabAiEnrichmentRow>();

  if (!enrichment) {
    return error("No AI suggestion found", 404);
  }

  await context.env.DB.prepare(
    `UPDATE vocab_items
      SET meaning = COALESCE(?, meaning),
          synonyms = CASE
            WHEN ? IS NOT NULL AND ? != '[]' THEN ?
            ELSE synonyms
          END,
          group_label = COALESCE(?, group_label),
          updated_at = ?
      WHERE id = ?`
  )
    .bind(
      enrichment.suggested_meaning,
      enrichment.suggested_synonyms,
      enrichment.suggested_synonyms,
      enrichment.suggested_synonyms,
      enrichment.suggested_group_label,
      new Date().toISOString(),
      id
    )
    .run();

  await context.env.DB.prepare(
    `UPDATE vocab_ai_enrichment SET accepted_at = ? WHERE item_id = ?`
  )
    .bind(new Date().toISOString(), id)
    .run();

  const updated = await getItemWithEnrichment(context.env.DB, id);
  if (!updated) return error("Item not found", 404);
  return json(updated);
};
