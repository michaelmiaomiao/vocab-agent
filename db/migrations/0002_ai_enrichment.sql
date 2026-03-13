CREATE TABLE IF NOT EXISTS vocab_ai_enrichment (
  item_id INTEGER PRIMARY KEY,
  normalized_phrase TEXT NOT NULL,
  suggested_meaning TEXT,
  suggested_group_label TEXT,
  suggested_synonyms TEXT,
  suggested_antonyms TEXT,
  usage_intent TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium'
    CHECK (difficulty IN ('easy', 'medium', 'hard')),
  review_priority INTEGER NOT NULL DEFAULT 50,
  confidence REAL NOT NULL DEFAULT 0.5,
  suggestion_source TEXT NOT NULL DEFAULT 'heuristic-v1',
  suggested_at TEXT NOT NULL,
  accepted_at TEXT,
  FOREIGN KEY (item_id) REFERENCES vocab_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vocab_ai_enrichment_review_priority
  ON vocab_ai_enrichment (review_priority DESC);
