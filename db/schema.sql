CREATE TABLE IF NOT EXISTS vocab_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phrase_text TEXT NOT NULL,
  note TEXT,
  tags TEXT,
  source TEXT,
  meaning TEXT,
  synonyms TEXT,
  group_label TEXT,
  review_status TEXT NOT NULL DEFAULT 'new'
    CHECK (review_status IN ('new', 'learning', 'mastered')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vocab_items_review_status
  ON vocab_items (review_status);

CREATE INDEX IF NOT EXISTS idx_vocab_items_created_at
  ON vocab_items (created_at DESC);
