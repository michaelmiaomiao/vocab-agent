import { useMemo, useState } from "react";
import { parseLooseBulkInput } from "@shared/bulkImport";
import { bulkCreateVocab, enrichVocabItem } from "../lib/api";

const sampleInput = `[IV] Business English

- Contingent on 视什么而定
- Bridge the gap
- Have something in place
- Get the buy-in from Sb. 获得某人支持

## 意愿/第一人称
- Don't have the appetite
- I'm more inclined to / I lean towards doing something

## 动词
- dive deeper 更详细地分析
- Elaborate on something 给出更多细节`;

export function BulkImportPage() {
  const [rawText, setRawText] = useState(sampleInput);
  const [autoEnrich, setAutoEnrich] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const preview = useMemo(() => parseLooseBulkInput(rawText), [rawText]);

  async function handleImport() {
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const result = await bulkCreateVocab(rawText);

      if (autoEnrich) {
        for (const item of result.created) {
          if (item.meaning?.trim()) {
            continue;
          }
          await enrichVocabItem(item.id);
        }
      }

      setMessage(
        autoEnrich
          ? `Imported ${result.created.length} item(s), auto-filled AI for items without meaning, skipped ${result.skipped.length}.`
          : `Imported ${result.created.length} item(s), skipped ${result.skipped.length}.`
      );
    } catch (importError) {
      setError(
        importError instanceof Error ? importError.message : "Bulk import failed"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="section-kicker">Bulk Import</p>
          <h2>Paste your loose vocab notes</h2>
          <p className="hero-copy">
            Titles become groups. Bullet lines become phrases. Slash-separated
            variants are imported as synonyms when possible.
          </p>
          <p className="muted">
            The long phrase list you pasted in chat is not auto-saved yet. Paste it
            here to actually import it into D1.
          </p>
        </div>
      </div>

      <div className="bulk-layout">
        <label className="bulk-editor">
          Raw notes
          <textarea
            rows={18}
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            onFocus={() => {
              if (rawText === sampleInput) {
                setRawText("");
              }
            }}
            placeholder="Paste your notes here"
          />
        </label>

        <div className="bulk-preview">
          <div className="bulk-preview-header">
            <h3>Preview</h3>
            <p className="muted">
              {preview.items.length} parsed, {preview.skipped.length} skipped
            </p>
          </div>
          <div className="preview-list">
            {preview.items.slice(0, 20).map((item) => (
              <article className="preview-card" key={`${item.source_line}-${item.phrase_text}`}>
                <p className="preview-line">Line {item.source_line}</p>
                <h4>{item.phrase_text}</h4>
                {item.note ? <p>{item.note}</p> : null}
                <p className="muted">
                  Group: {item.group_label || "-"} | Synonyms:{" "}
                  {item.synonyms?.length ? item.synonyms.join(", ") : "-"}
                </p>
              </article>
            ))}
            {preview.items.length > 20 ? (
              <p className="muted">
                Showing first 20 parsed items. Import will include the rest.
              </p>
            ) : null}
            {preview.items.length === 0 ? (
              <p className="muted">No valid items detected yet.</p>
            ) : null}
          </div>
          {preview.skipped.length ? (
            <div className="skipped-box">
              <h3>Skipped lines</h3>
              {preview.skipped.map((item) => (
                <p className="muted" key={`${item.line_number}-${item.raw_line}`}>
                  Line {item.line_number}: {item.reason}
                </p>
              ))}
            </div>
          ) : null}
          {message ? <p className="success-banner">{message}</p> : null}
          {error ? <p className="error-banner">{error}</p> : null}
          <label className="toggle-row">
            <input
              checked={autoEnrich}
              onChange={(event) => setAutoEnrich(event.target.checked)}
              type="checkbox"
            />
            Auto-fill Chinese meaning, synonyms, and example sentence after bulk import
          </label>
          <button
            className="primary-button"
            disabled={submitting || preview.items.length === 0}
            onClick={() => void handleImport()}
            type="button"
          >
            {submitting ? "Importing..." : "Bulk import to database"}
          </button>
        </div>
      </div>
    </section>
  );
}
