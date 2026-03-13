import { FormEvent, useState } from "react";
import { createVocabItem } from "../lib/api";

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
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      await createVocabItem({
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
      setForm(initialState);
      setMessage("Phrase saved.");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Create failed"
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
        <label>
          Phrase text
          <textarea
            required
            rows={3}
            value={form.phrase_text}
            onChange={(event) =>
              setForm((current) => ({ ...current, phrase_text: event.target.value }))
            }
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
        {message ? <p className="success-banner">{message}</p> : null}
        {error ? <p className="error-banner">{error}</p> : null}
        <button className="primary-button" disabled={submitting} type="submit">
          {submitting ? "Saving..." : "Save phrase"}
        </button>
      </form>
    </section>
  );
}
