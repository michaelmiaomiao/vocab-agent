export type ReviewStatus = "new" | "learning" | "mastered";
export type DifficultyLevel = "easy" | "medium" | "hard";

export interface VocabPayload {
  phrase_text: string;
  note?: string;
  tags?: string[];
  source?: string;
  meaning?: string;
  synonyms?: string[];
  group_label?: string;
}

export interface UpdateVocabItemInput extends Partial<VocabPayload> {
  review_status?: ReviewStatus;
  favorite?: boolean;
}

export interface VocabItem {
  id: number;
  phrase_text: string;
  note: string | null;
  tags: string[];
  source: string | null;
  meaning: string | null;
  synonyms: string[];
  group_label: string | null;
  review_status: ReviewStatus;
  favorite: boolean;
  created_at: string;
  updated_at: string;
  ai_enrichment: AiEnrichment | null;
  smart_score: number;
}

export interface VocabListResponse {
  items: VocabItem[];
}

export interface AiEnrichment {
  item_id: number;
  normalized_phrase: string;
  suggested_correction: string | null;
  correction_notes: string | null;
  suggested_meaning: string | null;
  suggested_group_label: string | null;
  suggested_word_type: string | null;
  suggested_synonyms: string[];
  suggested_antonyms: string[];
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

export interface BulkCreateResponse {
  created: VocabItem[];
  skipped: Array<{
    raw_line: string;
    reason: string;
  }>;
}

export interface DeleteByDateResponse {
  deleted: number;
}
