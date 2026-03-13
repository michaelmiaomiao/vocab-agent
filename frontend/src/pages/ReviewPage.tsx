import { useEffect, useState } from "react";
import { enrichVocabItem, listVocabSorted, updateVocabItem } from "../lib/api";
import type { VocabItem } from "@shared/types";

export function ReviewPage() {
  const [items, setItems] = useState<VocabItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadItems() {
    setLoading(true);
    setError(null);

    try {
      const data = await listVocabSorted("learning", "smart");
      setItems(data.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  async function handleStatusChange(
    id: number,
    reviewStatus: "learning" | "mastered"
  ) {
    try {
      await updateVocabItem(id, { review_status: reviewStatus });
      await loadItems();
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : "Update failed"
      );
    }
  }

  async function handleReviewed(item: VocabItem) {
    await handleStatusChange(item.id, "learning");
  }

  async function handleEnrich(id: number) {
    try {
      await enrichVocabItem(id);
      await loadItems();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "AI enrich failed");
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="section-kicker">Review Queue</p>
          <h2>Learning phrases</h2>
        </div>
      </div>
      {error ? <p className="error-banner">{error}</p> : null}
      {loading ? <p className="muted">Loading review queue...</p> : null}
      {!loading && items.length === 0 ? (
        <p className="muted">
          No phrases in learning status. Move a few items from new to learning in
          the database or API.
        </p>
      ) : null}
      <div className="review-stack">
        {items.map((item) => (
          <article key={item.id} className="review-card">
            <p className="review-group">{item.group_label || "Ungrouped"}</p>
            <h3>{item.phrase_text}</h3>
            {item.note ? <p>{item.note}</p> : null}
            <p className="muted">
              Tags: {item.tags.length ? item.tags.join(", ") : "none"} | Smart score:{" "}
              {item.smart_score}
            </p>
            {item.ai_enrichment?.suggested_example_sentence ? (
              <div className="ai-box">
                <p className="section-kicker">AI Example</p>
                <p>{item.ai_enrichment.suggested_example_sentence}</p>
                <p className="muted">
                  {item.ai_enrichment.suggested_example_context || "business context"}
                </p>
              </div>
            ) : null}
            <div className="action-row">
              <button className="ghost-button" onClick={() => void handleEnrich(item.id)}>
                AI enrich
              </button>
              <button className="ghost-button" onClick={() => void handleReviewed(item)}>
                Mark reviewed
              </button>
              <button
                className="secondary-button"
                onClick={() => void handleStatusChange(item.id, "mastered")}
              >
                Mark mastered
              </button>
              <button
                className="ghost-button"
                onClick={() => void handleStatusChange(item.id, "learning")}
              >
                Send back to learning
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
