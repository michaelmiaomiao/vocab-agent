import type { PagesFunction } from "@cloudflare/workers-types";
import type { Env } from "../../types";
import { parseLooseBulkInput } from "../../../shared/bulkImport";
import { error, json } from "../../utils/http";
import {
  hasExistingPhrase,
  insertVocabItem,
  toVocabItem
} from "../../utils/vocab";

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: unknown;

  try {
    body = await context.request.json();
  } catch {
    return error("Invalid JSON body");
  }

  const rawText =
    typeof (body as { raw_text?: unknown })?.raw_text === "string"
      ? (body as { raw_text: string }).raw_text
      : "";

  if (!rawText.trim()) {
    return error("raw_text is required");
  }

  const preview = parseLooseBulkInput(rawText);
  const created = [];
  const skipped = [...preview.skipped].map((item) => ({
    raw_line: item.raw_line,
    reason: item.reason
  }));

  for (const item of preview.items) {
    if (await hasExistingPhrase(context.env.DB, item.phrase_text)) {
      skipped.push({
        raw_line: item.raw_line,
        reason: "Duplicate phrase_text"
      });
      continue;
    }

    const inserted = await insertVocabItem(context.env.DB, {
      phrase_text: item.phrase_text,
      note: item.note ?? null,
      tags: item.tags ?? [],
      source: item.source ?? null,
      meaning: item.meaning ?? null,
      synonyms: item.synonyms ?? [],
      group_label: item.group_label ?? null,
      review_status: "new"
    });

    if (inserted) {
      created.push(toVocabItem(inserted));
    } else {
      skipped.push({
        raw_line: item.raw_line,
        reason: "Insert failed"
      });
    }
  }

  return json({ created, skipped }, 201);
};
