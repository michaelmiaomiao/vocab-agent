import type { DifficultyLevel, ReviewStatus } from "../shared/types";

export interface Env {
  DB: D1Database;
}

export interface VocabRow {
  id: number;
  phrase_text: string;
  note: string | null;
  tags: string | null;
  source: string | null;
  meaning: string | null;
  synonyms: string | null;
  group_label: string | null;
  review_status: ReviewStatus;
  created_at: string;
  updated_at: string;
}

export interface VocabAiEnrichmentRow {
  item_id: number;
  normalized_phrase: string;
  suggested_meaning: string | null;
  suggested_group_label: string | null;
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
