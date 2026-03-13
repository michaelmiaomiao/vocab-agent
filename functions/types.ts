import type { ReviewStatus } from "../shared/types";

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
