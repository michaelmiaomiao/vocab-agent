import { describe, expect, it } from "vitest";
import { parseLooseBulkInput } from "./bulkImport";

describe("parseLooseBulkInput", () => {
  it("parses headings, inline Chinese notes, and slash variants", () => {
    const preview = parseLooseBulkInput(
      [
        "[IV] Business English",
        "- Contingent on 视什么而定",
        "- bridge the gap / close the gap / fill the gap",
        "",
        "## 动词",
        "- dive deeper - 更详细地分析"
      ].join("\n")
    );

    expect(preview.skipped).toEqual([]);
    expect(preview.items).toHaveLength(3);
    expect(preview.items[0]).toMatchObject({
      phrase_text: "contingent on",
      note: "视什么而定",
      group_label: "Business English",
      tags: ["Business English"]
    });
    expect(preview.items[1]).toMatchObject({
      phrase_text: "bridge the gap",
      synonyms: ["close the gap", "fill the gap"]
    });
    expect(preview.items[2]).toMatchObject({
      phrase_text: "dive deeper",
      note: "更详细地分析",
      group_label: "动词"
    });
  });

  it("ignores obvious noise and reports empty phrase lines", () => {
    const preview = parseLooseBulkInput(
      [
        "https://example.com/foo",
        "____",
        "- / / /",
        "*   ",
        "switching gears"
      ].join("\n")
    );

    expect(preview.items).toHaveLength(1);
    expect(preview.items[0].phrase_text).toBe("switching gears");
    expect(preview.skipped).toEqual([
      {
        line_number: 3,
        raw_line: "- / / /",
        reason: "No phrase text detected"
      },
      {
        line_number: 4,
        raw_line: "*   ",
        reason: "No phrase text detected"
      }
    ]);
  });
});
