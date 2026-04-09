import type { AppPagesFunction, VocabRow } from "../../../types";
import { error, json } from "../../../utils/http";
import {
  findExistingPhrase,
  getNormalizedPhrase,
  getItemWithEnrichment,
  parseJsonList,
  serializeList
} from "../../../utils/vocab";

function combineUniqueText(left: string | null, right: string | null) {
  const values = [left, right]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return [...new Set(values)].join(" | ") || null;
}

function mergeReviewStatus(
  left: VocabRow["review_status"],
  right: VocabRow["review_status"]
): VocabRow["review_status"] {
  const rank = {
    new: 1,
    learning: 2,
    mastered: 3
  } as const;

  return rank[left] >= rank[right] ? left : right;
}

export const onRequestPost: AppPagesFunction = async (context) => {
  const sourceId = Number(context.params.id);

  if (!Number.isInteger(sourceId) || sourceId <= 0) {
    return error("Invalid id");
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return error("Invalid JSON body");
  }

  const targetInput =
    typeof (body as { target?: unknown })?.target === "string"
      ? (body as { target: string }).target.trim()
      : "";

  if (!targetInput) {
    return error("target is required");
  }

  const source = await context.env.DB.prepare(`SELECT * FROM vocab_items WHERE id = ?`)
    .bind(sourceId)
    .first<VocabRow>();

  if (!source) {
    return error("Source item not found", 404);
  }

  let target: VocabRow | null = null;
  const targetId = Number(targetInput);

  if (Number.isInteger(targetId) && targetId > 0) {
    target = await context.env.DB.prepare(`SELECT * FROM vocab_items WHERE id = ?`)
      .bind(targetId)
      .first<VocabRow>();
  } else {
    target = await findExistingPhrase(context.env.DB, targetInput);
  }

  if (!target) {
    return error("Target item not found", 404);
  }

  if (target.id === source.id) {
    return error("Cannot merge an item into itself");
  }

  const mergedSynonyms = [
    ...parseJsonList(target.synonyms),
    ...parseJsonList(source.synonyms),
    source.phrase_text
  ].filter(Boolean);

  const normalizedSynonyms = [...new Set(mergedSynonyms)];

  await context.env.DB.prepare(
    `UPDATE vocab_items
      SET note = ?,
          source = ?,
          meaning = ?,
          synonyms = ?,
          group_label = ?,
          review_status = ?,
          favorite = ?,
          normalized_phrase = ?,
          updated_at = ?
      WHERE id = ?`
  )
    .bind(
      combineUniqueText(target.note, source.note),
      target.source ?? source.source,
      target.meaning ?? source.meaning,
      serializeList(normalizedSynonyms),
      target.group_label ?? source.group_label,
      mergeReviewStatus(target.review_status, source.review_status),
      target.favorite || source.favorite ? 1 : 0,
      getNormalizedPhrase(target.phrase_text),
      new Date().toISOString(),
      target.id
    )
    .run();

  await context.env.DB.prepare(`DELETE FROM vocab_items WHERE id = ?`)
    .bind(source.id)
    .run();

  const updated = await getItemWithEnrichment(context.env.DB, target.id);
  if (!updated) {
    return error("Failed to fetch merged item", 500);
  }

  return json(updated);
};
