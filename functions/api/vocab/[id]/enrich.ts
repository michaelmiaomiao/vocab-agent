import type { PagesFunction } from "@cloudflare/workers-types";
import type { Env } from "../../../types";
import { error, json } from "../../../utils/http";
import { generateHeuristicEnrichment } from "../../../utils/enrichment";
import { getItemWithEnrichment } from "../../../utils/vocab";

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const id = Number(context.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return error("Invalid id");
  }

  const item = await getItemWithEnrichment(context.env.DB, id);

  if (!item) {
    return error("Item not found", 404);
  }

  const suggestion = generateHeuristicEnrichment(item);

  await context.env.DB.prepare(
    `INSERT INTO vocab_ai_enrichment (
      item_id,
      normalized_phrase,
      suggested_meaning,
      suggested_group_label,
      suggested_synonyms,
      suggested_antonyms,
      suggested_example_sentence,
      suggested_example_context,
      usage_intent,
      difficulty,
      review_priority,
      confidence,
      suggestion_source,
      suggested_at,
      accepted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(item_id) DO UPDATE SET
      normalized_phrase = excluded.normalized_phrase,
      suggested_meaning = excluded.suggested_meaning,
      suggested_group_label = excluded.suggested_group_label,
      suggested_synonyms = excluded.suggested_synonyms,
      suggested_antonyms = excluded.suggested_antonyms,
      suggested_example_sentence = excluded.suggested_example_sentence,
      suggested_example_context = excluded.suggested_example_context,
      usage_intent = excluded.usage_intent,
      difficulty = excluded.difficulty,
      review_priority = excluded.review_priority,
      confidence = excluded.confidence,
      suggestion_source = excluded.suggestion_source,
      suggested_at = excluded.suggested_at`
  )
    .bind(
      id,
      suggestion.normalized_phrase,
      suggestion.suggested_meaning,
      suggestion.suggested_group_label,
      JSON.stringify(suggestion.suggested_synonyms),
      JSON.stringify(suggestion.suggested_antonyms),
      suggestion.suggested_example_sentence,
      suggestion.suggested_example_context,
      suggestion.usage_intent,
      suggestion.difficulty,
      suggestion.review_priority,
      suggestion.confidence,
      suggestion.suggestion_source,
      suggestion.suggested_at,
      suggestion.accepted_at
    )
    .run();

  const updated = await getItemWithEnrichment(context.env.DB, id);
  if (!updated) return error("Item not found", 404);
  return json(updated);
};
