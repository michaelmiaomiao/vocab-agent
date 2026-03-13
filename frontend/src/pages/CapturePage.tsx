import { FormEvent, useState } from "react";
import { parseLooseBulkInput } from "@shared/bulkImport";
import { bulkCreateVocab, createVocabItem, enrichVocabItem } from "../lib/api";

const initialState = {
  phrase_text: "",
  note: "",
  tags: "",
  source: "",
  meaning: "",
  synonyms: "",
  group_label: ""
};

export function CapturePage() {
  const [form, setForm] = useState(initialState);
  const [quickInput, setQuickInput] = useState("");
  const [autoEnrich, setAutoEnrich] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function isSubmitShortcut(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    return event.key === "Enter" && (event.metaKey || event.ctrlKey);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const created = await createVocabItem({
        phrase_text: form.phrase_text,
        note: form.note || undefined,
        tags: form.tags
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        source: form.source || undefined,
        meaning: form.meaning || undefined,
        synonyms: form.synonyms
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        group_label: form.group_label || undefined
      });

      const shouldAutoEnrich =
        autoEnrich &&
        !created.meaning?.trim();

      if (shouldAutoEnrich) {
        await enrichVocabItem(created.id);
      }

      setForm(initialState);
      setMessage(
        shouldAutoEnrich
          ? "Phrase saved and AI filled meaning/example."
          : "Phrase saved."
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Create failed"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuickImport() {
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const parsed = parseLooseBulkInput(quickInput);

      if (!parsed.items.length) {
        throw new Error("Add at least one word or phrase");
      }

      const result = await bulkCreateVocab(quickInput);

      if (autoEnrich) {
        for (const item of result.created) {
          if (item.meaning?.trim()) {
            continue;
          }
          await enrichVocabItem(item.id);
        }
      }

      setQuickInput("");
      setMessage(
        autoEnrich
          ? `Imported ${result.created.length} item(s) and auto-filled AI meaning/example.`
          : `Imported ${result.created.length} item(s).`
      );
    } catch (importError) {
      setError(
        importError instanceof Error ? importError.message : "Quick import failed"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="section-kicker">Quick Capture</p>
          <h2>Save a phrase fast</h2>
        </div>
        <p className="muted">
          Have a long note already? Use Bulk Import for loose pasted vocab lists.
        </p>
      </div>
      <form className="capture-form" onSubmit={(event) => void handleSubmit(event)}>
        <div className="quick-box">
          <div className="quick-box-header">
            <div>
              <p className="section-kicker">Quick Add</p>
              <h3>Paste loose notes, one phrase per line or mixed bullets</h3>
            </div>
            <button
              className="primary-button"
              disabled={submitting}
              onClick={() => void handleQuickImport()}
              type="button"
            >
              {submitting ? "Importing..." : "Quick import"}
            </button>
          </div>
          <textarea
            rows={6}
            placeholder={
              "derive\nredact\nget the buy-in\nswitching gears\n\n## 动词\n- dive deeper 更详细地分析"
            }
            value={quickInput}
            onChange={(event) => setQuickInput(event.target.value)}
            onKeyDown={(event) => {
              if (isSubmitShortcut(event)) {
                event.preventDefault();
                void handleQuickImport();
              }
            }}
          />
          <p className="muted shortcut-note">
            Cmd/Ctrl + Enter to quick import. Loose bullets and headings are okay.
          </p>
        </div>
        <label>
          Phrase text
          <textarea
            required
            rows={3}
            value={form.phrase_text}
            onChange={(event) =>
              setForm((current) => ({ ...current, phrase_text: event.target.value }))
            }
            onKeyDown={(event) => {
              if (isSubmitShortcut(event)) {
                event.preventDefault();
                const formElement = event.currentTarget.form;
                if (formElement) {
                  formElement.requestSubmit();
                }
              }
            }}
          />
        </label>
        <label>
          Note
          <input
            value={form.note}
            onChange={(event) =>
              setForm((current) => ({ ...current, note: event.target.value }))
            }
          />
        </label>
        <label>
          Tags
          <input
            placeholder="meeting, followup"
            value={form.tags}
            onChange={(event) =>
              setForm((current) => ({ ...current, tags: event.target.value }))
            }
          />
        </label>
        <label>
          Source
          <input
            placeholder="slack"
            value={form.source}
            onChange={(event) =>
              setForm((current) => ({ ...current, source: event.target.value }))
            }
          />
        </label>
        <label>
          Meaning
          <input
            placeholder="Follow up on an issue"
            value={form.meaning}
            onChange={(event) =>
              setForm((current) => ({ ...current, meaning: event.target.value }))
            }
          />
        </label>
        <label>
          Synonyms
          <input
            placeholder="follow up, check in"
            value={form.synonyms}
            onChange={(event) =>
              setForm((current) => ({ ...current, synonyms: event.target.value }))
            }
          />
        </label>
        <label>
          Group label
          <input
            placeholder="meeting communication"
            value={form.group_label}
            onChange={(event) =>
              setForm((current) => ({ ...current, group_label: event.target.value }))
            }
          />
        </label>
        <label className="toggle-row">
          <input
            checked={autoEnrich}
            onChange={(event) => setAutoEnrich(event.target.checked)}
            type="checkbox"
          />
          Auto-fill Chinese meaning, synonyms, and example sentence
        </label>
        {message ? <p className="success-banner">{message}</p> : null}
        {error ? <p className="error-banner">{error}</p> : null}
        <p className="muted shortcut-note">Cmd/Ctrl + Enter to save current phrase</p>
        <button className="primary-button" disabled={submitting} type="submit">
          {submitting ? "Saving..." : "Save phrase"}
        </button>
      </form>
    </section>
  );
}
