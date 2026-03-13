import { useEffect, useState } from "react";
import { deleteVocabItem, listVocab } from "../lib/api";
import type { ReviewStatus, VocabItem } from "@shared/types";

const filters: Array<ReviewStatus | "all"> = [
  "all",
  "new",
  "learning",
  "mastered"
];

export function HomePage() {
  const [items, setItems] = useState<VocabItem[]>([]);
  const [filter, setFilter] = useState<ReviewStatus | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadItems(nextFilter: ReviewStatus | "all") {
    setLoading(true);
    setError(null);

    try {
      const data = await listVocab(nextFilter);
      setItems(data.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadItems(filter);
  }, [filter]);

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this phrase?")) {
      return;
    }

    try {
      await deleteVocabItem(id);
      await loadItems(filter);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Delete failed"
      );
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="section-kicker">Vocabulary List</p>
          <h2>Saved phrases</h2>
        </div>
        <div className="filter-row">
          {filters.map((option) => (
            <button
              key={option}
              className={option === filter ? "chip active" : "chip"}
              onClick={() => setFilter(option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="error-banner">{error}</p> : null}
      {loading ? <p className="muted">Loading phrases...</p> : null}
      {!loading && items.length === 0 ? (
        <p className="muted">No phrases yet. Capture one on the next tab.</p>
      ) : null}

      <div className="card-grid">
        {items.map((item) => (
          <article className="vocab-card" key={item.id}>
            <div className="card-topline">
              <span className={`status-pill ${item.review_status}`}>
                {item.review_status}
              </span>
              <time>{new Date(item.created_at).toLocaleString()}</time>
            </div>
            <h3>{item.phrase_text}</h3>
            {item.note ? <p>{item.note}</p> : null}
            <dl className="meta-grid">
              <div>
                <dt>Tags</dt>
                <dd>{item.tags.length ? item.tags.join(", ") : "-"}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{item.source || "-"}</dd>
              </div>
              <div>
                <dt>Meaning</dt>
                <dd>{item.meaning || "-"}</dd>
              </div>
              <div>
                <dt>Group</dt>
                <dd>{item.group_label || "-"}</dd>
              </div>
              <div>
                <dt>Synonyms</dt>
                <dd>{item.synonyms.length ? item.synonyms.join(", ") : "-"}</dd>
              </div>
            </dl>
            <button className="ghost-button" onClick={() => void handleDelete(item.id)}>
              Delete
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
