import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeSmartScore, generateHeuristicEnrichment } from "./enrichment";
import type { VocabItem } from "../../shared/types";

function makeItem(overrides: Partial<VocabItem> = {}): VocabItem {
  return {
    id: 1,
    phrase_text: "chase it up",
    note: null,
    tags: [],
    source: "slack",
    meaning: null,
    synonyms: [],
    group_label: null,
    review_status: "new",
    favorite: false,
    created_at: "2026-04-01T12:00:00.000Z",
    updated_at: "2026-04-01T12:00:00.000Z",
    ai_enrichment: null,
    smart_score: 0,
    ...overrides
  };
}

describe("generateHeuristicEnrichment", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-09T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("infers business-oriented metadata for follow-up phrases", () => {
    const enrichment = generateHeuristicEnrichment(
      makeItem({
        note: "follow up on the open action",
        synonyms: ["follow up"]
      })
    );

    expect(enrichment.normalized_phrase).toBe("chase it up");
    expect(enrichment.suggested_group_label).toBe("follow-up");
    expect(enrichment.usage_intent).toContain("follow up");
    expect(enrichment.suggested_synonyms).toEqual(
      expect.arrayContaining(["follow up", "check in", "nudge"])
    );
    expect(enrichment.suggested_synonyms).not.toContain("chase it up");
    expect(enrichment.suggested_example_sentence).toContain("I'll chase it up");
    expect(enrichment.suggestion_source).toBe("heuristic-v1");
  });

  it("computes higher smart score for newer and harder items", () => {
    const learningItem = makeItem({
      review_status: "learning",
      created_at: "2026-04-08T12:00:00.000Z"
    });

    const masteredItem = makeItem({
      review_status: "mastered",
      created_at: "2026-03-01T12:00:00.000Z"
    });

    const hardEnrichment = generateHeuristicEnrichment(
      makeItem({
        phrase_text: "contingent on the outcome of the stakeholder review",
        synonyms: ["dependent on", "subject to", "hinging on"]
      })
    );

    const learningScore = computeSmartScore(learningItem, hardEnrichment as never);
    const masteredScore = computeSmartScore(masteredItem, null);

    expect(learningScore).toBeGreaterThan(masteredScore);
  });
});
