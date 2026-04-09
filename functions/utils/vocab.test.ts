import { describe, expect, it } from "vitest";
import {
  getNormalizedPhrase,
  parseJsonList,
  sanitizeCreatePayload,
  sanitizeUpdatePayload
} from "./vocab";

describe("vocab utilities", () => {
  it("normalizes phrases for dedupe and search", () => {
    expect(getNormalizedPhrase('  "Bridge-the_gap/Now!"  ')).toBe("bridge the gap now");
  });

  it("parses JSON string arrays safely", () => {
    expect(parseJsonList('["align", "follow up", 3, null]')).toEqual([
      "align",
      "follow up"
    ]);
    expect(parseJsonList("not-json")).toEqual([]);
  });

  it("sanitizes create payloads and trims empty values", () => {
    const parsed = sanitizeCreatePayload({
      phrase_text: "  chase it up  ",
      note: "  ",
      tags: ["meeting", "", " followup "],
      synonyms: ["follow up", " ", "check in"]
    });

    expect(parsed).toEqual({
      value: {
        phrase_text: "chase it up",
        note: null,
        tags: ["meeting", "followup"],
        source: null,
        meaning: null,
        synonyms: ["follow up", "check in"],
        group_label: null,
        review_status: "new"
      }
    });
  });

  it("validates favorite and empty phrase updates", () => {
    expect(sanitizeUpdatePayload({ favorite: false })).toEqual({
      value: { favorite: false }
    });
    expect(sanitizeUpdatePayload({ favorite: "yes" as never })).toEqual({
      error: "Invalid favorite value"
    });
    expect(sanitizeUpdatePayload({ phrase_text: "   " })).toEqual({
      error: "phrase_text cannot be empty"
    });
  });
});
