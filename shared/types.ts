export type ReviewStatus = "new" | "learning" | "mastered";

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
  created_at: string;
  updated_at: string;
}

export interface VocabListResponse {
  items: VocabItem[];
}
