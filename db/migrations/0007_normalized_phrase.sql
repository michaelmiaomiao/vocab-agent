ALTER TABLE vocab_items ADD COLUMN normalized_phrase TEXT;

UPDATE vocab_items
SET normalized_phrase = lower(
  trim(
    replace(
      replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(
                    replace(
                      replace(
                        replace(
                          replace(
                            replace(
                              replace(
                                replace(
                                  replace(
                                    replace(
                                      replace(
                                        replace(phrase_text, '“', ''),
                                        '”', ''
                                      ),
                                      '"', ''
                                    ),
                                    '''', ''
                                  ),
                                  '`', ''
                                ),
                                '.', ' '
                              ),
                              ',', ' '
                            ),
                            '!', ' '
                          ),
                          '?', ' '
                        ),
                        ';', ' '
                      ),
                      ':', ' '
                    ),
                    '(', ' '
                  ),
                  ')', ' '
                ),
                '[', ' '
              ),
              ']', ' '
            ),
            '{', ' '
          ),
          '}', ' '
        ),
        '-', ' '
      ),
      '/', ' '
    )
  )
)
WHERE normalized_phrase IS NULL;

CREATE INDEX IF NOT EXISTS idx_vocab_items_normalized_phrase
  ON vocab_items (normalized_phrase);
