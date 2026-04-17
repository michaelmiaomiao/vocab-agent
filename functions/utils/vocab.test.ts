import { describe, expect, it } from "vitest";
import {
  getNormalizedPhrase,
  insertVocabItem,
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

  it("uses one placeholder per inserted vocab_items column", async () => {
    let sql = "";
    let bindArgs: unknown[] = [];

    const db = {
      prepare(statement: string) {
        if (statement.includes("INSERT INTO vocab_items")) {
          sql = statement;
          return {
            bind(...args: unknown[]) {
              bindArgs = args;
              return {
                async run() {
                  return {
                    meta: { last_row_id: 1 }
                  };
                }
              };
            }
          };
        }

        return {
          bind(...args: unknown[]) {
            return {
              async first() {
                return {
                  id: Number(args[0]),
                  phrase_text: "chase it up",
                  normalized_phrase: "chase it up",
                  note: null,
                  tags: "[]",
                  source: null,
                  meaning: null,
                  synonyms: "[]",
                  group_label: null,
                  review_status: "new",
                  favorite: 0,
                  created_at: "2026-04-14T00:00:00.000Z",
                  updated_at: "2026-04-14T00:00:00.000Z"
                };
              }
            };
          }
        };
      }
    } as unknown as D1Database;

    await insertVocabItem(db, {
      phrase_text: "chase it up",
      note: null,
      tags: [],
      source: null,
      meaning: null,
      synonyms: [],
      group_label: null,
      review_status: "new",
      favorite: false
    });

    const valuesSection = sql.match(/VALUES \((.*)\)/s)?.[1] ?? "";
    const placeholderCount = (valuesSection.match(/\?/g) ?? []).length;

    expect(placeholderCount).toBe(bindArgs.length);
    expect(bindArgs.length).toBe(12);
  });
});
