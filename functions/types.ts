import type { DifficultyLevel, ReviewStatus } from "../shared/types";

export interface Env {
  DB: D1Database;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
}

export type AppPagesFunction<Params extends Record<string, string> = Record<string, string>> = (
  context: {
    request: Request;
    env: Env;
    params: Params;
    waitUntil?: (promise: Promise<unknown>) => void;
  }
) => Response | Promise<Response>;

export interface VocabRow {
  id: number;
  phrase_text: string;
  normalized_phrase: string | null;
  note: string | null;
  tags: string | null;
  source: string | null;
  meaning: string | null;
  synonyms: string | null;
  group_label: string | null;
  review_status: ReviewStatus;
  favorite: number;
  created_at: string;
  updated_at: string;
}

export interface VocabAiEnrichmentRow {
  item_id: number;
  normalized_phrase: string;
  suggested_correction: string | null;
  correction_notes: string | null;
  suggested_meaning: string | null;
  suggested_group_label: string | null;
  suggested_word_type: string | null;
  suggested_synonyms: string | null;
  suggested_antonyms: string | null;
  suggested_example_sentence: string | null;
  suggested_example_context: string | null;
  usage_intent: string | null;
  difficulty: DifficultyLevel;
  review_priority: number;
  confidence: number;
  suggestion_source: string;
  suggested_at: string;
  accepted_at: string | null;
}
