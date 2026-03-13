import type { AiEnrichment, VocabItem } from "../../shared/types";

interface OpenAIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

function stripCodeFence(text: string) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))];
}

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.round(value)));
}

export async function generateLlmEnrichment(
  item: VocabItem,
  apiKey: string,
  model = "gpt-4.1-mini"
): Promise<Omit<AiEnrichment, "item_id">> {
  const prompt = [
    "You are helping build a personal Business English vocabulary trainer.",
    "Return one compact JSON object only. No markdown, no commentary.",
    "The phrase may be a single word, a business phrase, or an imperfect learner note.",
    "Tasks:",
    "1. Correct spelling, grammar, or phrasing only if needed.",
    "2. Preserve the user's meaning and professional tone.",
    "3. Generate one natural example sentence that sounds like real business, data, or engineering communication.",
    "4. Keep synonyms and antonyms useful for workplace English.",
    "5. If an antonym is not natural, return an empty array.",
    'JSON keys: normalized_phrase, suggested_correction, correction_notes, suggested_meaning, suggested_group_label, suggested_synonyms, suggested_antonyms, suggested_example_sentence, suggested_example_context, usage_intent, difficulty, review_priority, confidence, suggestion_source.',
    'difficulty must be one of: "easy", "medium", "hard".',
    "review_priority should be an integer 1-100.",
    "confidence should be a number 0-1.",
    "",
    `phrase_text: ${item.phrase_text}`,
    `note: ${item.note ?? ""}`,
    `existing_meaning: ${item.meaning ?? ""}`,
    `existing_group_label: ${item.group_label ?? ""}`,
    `existing_synonyms: ${item.synonyms.join(", ")}`,
    `status: ${item.review_status}`,
    "Preferred example contexts: business meetings, stakeholder updates, data engineering, analytics, product delivery."
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You write natural Business English learning content for a technical professional."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  const payload = (await response.json()) as OpenAIResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message || "OpenAI request failed");
  }

  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI response did not include content");
  }

  const parsed = JSON.parse(stripCodeFence(content)) as Record<string, unknown>;

  return {
    normalized_phrase: normalizeOptionalString(parsed.normalized_phrase) ?? item.phrase_text.toLowerCase(),
    suggested_correction:
      normalizeOptionalString(parsed.suggested_correction) ?? item.phrase_text,
    correction_notes: normalizeOptionalString(parsed.correction_notes),
    suggested_meaning: normalizeOptionalString(parsed.suggested_meaning),
    suggested_group_label: normalizeOptionalString(parsed.suggested_group_label),
    suggested_synonyms: normalizeStringArray(parsed.suggested_synonyms),
    suggested_antonyms: normalizeStringArray(parsed.suggested_antonyms),
    suggested_example_sentence: normalizeOptionalString(parsed.suggested_example_sentence),
    suggested_example_context: normalizeOptionalString(parsed.suggested_example_context),
    usage_intent: normalizeOptionalString(parsed.usage_intent),
    difficulty:
      parsed.difficulty === "easy" || parsed.difficulty === "medium" || parsed.difficulty === "hard"
        ? parsed.difficulty
        : "medium",
    review_priority: clampNumber(parsed.review_priority, 70, 1, 100),
    confidence:
      typeof parsed.confidence === "number" && !Number.isNaN(parsed.confidence)
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.8,
    suggestion_source: normalizeOptionalString(parsed.suggestion_source) ?? `openai:${model}`,
    suggested_at: new Date().toISOString(),
    accepted_at: null
  };
}
