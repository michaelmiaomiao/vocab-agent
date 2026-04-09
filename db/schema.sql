CREATE TABLE IF NOT EXISTS vocab_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phrase_text TEXT NOT NULL,
  normalized_phrase TEXT NOT NULL,
  note TEXT,
  tags TEXT,
  source TEXT,
  meaning TEXT,
  synonyms TEXT,
  group_label TEXT,
  review_status TEXT NOT NULL DEFAULT 'new'
    CHECK (review_status IN ('new', 'learning', 'mastered')),
  favorite INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vocab_items_review_status
  ON vocab_items (review_status);

CREATE INDEX IF NOT EXISTS idx_vocab_items_created_at
  ON vocab_items (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vocab_items_normalized_phrase
  ON vocab_items (normalized_phrase);

CREATE TABLE IF NOT EXISTS vocab_ai_enrichment (
  item_id INTEGER PRIMARY KEY,
  normalized_phrase TEXT NOT NULL,
  suggested_correction TEXT,
  correction_notes TEXT,
  suggested_meaning TEXT,
  suggested_group_label TEXT,
  suggested_word_type TEXT,
  suggested_synonyms TEXT,
  suggested_antonyms TEXT,
  suggested_example_sentence TEXT,
  suggested_example_context TEXT,
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
