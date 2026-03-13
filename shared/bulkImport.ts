import type { VocabPayload } from "./types";

export interface BulkImportDraft extends VocabPayload {
  group_label?: string;
  source_line: number;
  raw_line: string;
}

export interface BulkImportSkippedLine {
  line_number: number;
  raw_line: string;
  reason: string;
}

export interface BulkImportPreview {
  items: BulkImportDraft[];
  skipped: BulkImportSkippedLine[];
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isHeading(line: string) {
  return /^(#{1,6}\s+.+|\[[^\]]+\].+)$/.test(line);
}

function looksLikeNoise(line: string) {
  return /^[_=]{3,}$/.test(line) || /^https?:\/\//i.test(line);
}

function cleanHeading(line: string) {
  return normalizeWhitespace(
    line.replace(/^#{1,6}\s*/, "").replace(/^\[[^\]]+\]\s*/, "")
  );
}

function splitInlineNote(line: string) {
  const separators = [" - ", " — ", " – ", " ：", ": "];

  for (const separator of separators) {
    const index = line.indexOf(separator);
    if (index > 0) {
      return {
        phraseSide: line.slice(0, index).trim(),
        noteSide: line.slice(index + separator.length).trim()
      };
    }
  }

  const cjkMatch = line.match(/[\u3400-\u9fff]/);
  if (cjkMatch && cjkMatch.index && cjkMatch.index > 0) {
    return {
      phraseSide: line.slice(0, cjkMatch.index).trim(),
      noteSide: line.slice(cjkMatch.index).trim()
    };
  }

  return {
    phraseSide: line.trim(),
    noteSide: ""
  };
}

function splitPhraseVariants(phraseSide: string) {
  return phraseSide
    .split(/\s*(?:<>|\/)\s*/g)
    .map((value) => normalizeWhitespace(value))
    .filter(Boolean);
}

function dedupe(values: string[]) {
  return [...new Set(values)];
}

export function parseLooseBulkInput(rawText: string): BulkImportPreview {
  const lines = rawText.split(/\r?\n/);
  const items: BulkImportDraft[] = [];
  const skipped: BulkImportSkippedLine[] = [];
  let currentGroup: string | undefined;

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const trimmed = rawLine.trim();

    if (!trimmed) {
      return;
    }

    if (looksLikeNoise(trimmed)) {
      return;
    }

    if (isHeading(trimmed)) {
      currentGroup = cleanHeading(trimmed);
      return;
    }

    const bulletStripped = trimmed.replace(/^[-*•]\s+/, "").trim();
    const candidate = normalizeWhitespace(bulletStripped);

    if (!candidate) {
      return;
    }

    const { phraseSide, noteSide } = splitInlineNote(candidate);
    const variants = splitPhraseVariants(phraseSide);
    const phraseText = variants[0];

    if (!phraseText) {
      skipped.push({
        line_number: lineNumber,
        raw_line: rawLine,
        reason: "No phrase text detected"
      });
      return;
    }

    const synonyms = dedupe(
      variants.slice(1).map((value) => value.replace(/\.$/, "").trim())
    );

    items.push({
      phrase_text: phraseText,
      note: noteSide || undefined,
      synonyms,
      tags: currentGroup ? [currentGroup] : [],
      group_label: currentGroup,
      source_line: lineNumber,
      raw_line: rawLine
    });
  });

  return { items, skipped };
}
