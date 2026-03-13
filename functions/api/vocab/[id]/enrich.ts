import type { AppPagesFunction } from "../../../types";
import { error, json } from "../../../utils/http";
import { generateHeuristicEnrichment } from "../../../utils/enrichment";
import { generateLlmEnrichment } from "../../../utils/llm";
import { getItemWithEnrichment } from "../../../utils/vocab";

export const onRequestPost: AppPagesFunction = async (context) => {
  const id = Number(context.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return error("Invalid id");
  }

  const item = await getItemWithEnrichment(context.env.DB, id);

  if (!item) {
    return error("Item not found", 404);
  }

  let suggestion = generateHeuristicEnrichment(item);

  if (context.env.OPENAI_API_KEY) {
    try {
      suggestion = await generateLlmEnrichment(
        item,
        context.env.OPENAI_API_KEY,
        context.env.OPENAI_MODEL || "gpt-4.1-mini"
      );
    } catch (llmError) {
      console.error("LLM enrichment failed, falling back to heuristic", llmError);
    }
  }

  await context.env.DB.prepare(
    `INSERT INTO vocab_ai_enrichment (
      item_id,
      normalized_phrase,
      suggested_correction,
      correction_notes,
      suggested_meaning,
      suggested_group_label,
      suggested_word_type,
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(item_id) DO UPDATE SET
      normalized_phrase = excluded.normalized_phrase,
      suggested_correction = excluded.suggested_correction,
      correction_notes = excluded.correction_notes,
      suggested_meaning = excluded.suggested_meaning,
      suggested_group_label = excluded.suggested_group_label,
      suggested_word_type = excluded.suggested_word_type,
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
      suggestion.suggested_correction,
      suggestion.correction_notes,
      suggestion.suggested_meaning,
      suggestion.suggested_group_label,
      suggestion.suggested_word_type,
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

  await context.env.DB.prepare(
    `UPDATE vocab_items
      SET phrase_text = COALESCE(?, phrase_text),
          meaning = COALESCE(?, meaning),
          synonyms = CASE
            WHEN ? IS NOT NULL AND ? != '[]' THEN ?
            ELSE synonyms
          END,
          group_label = COALESCE(?, group_label),
          updated_at = ?
      WHERE id = ?`
  )
    .bind(
      suggestion.suggested_correction,
      suggestion.suggested_meaning,
      JSON.stringify(suggestion.suggested_synonyms),
      JSON.stringify(suggestion.suggested_synonyms),
      JSON.stringify(suggestion.suggested_synonyms),
      suggestion.suggested_group_label,
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
