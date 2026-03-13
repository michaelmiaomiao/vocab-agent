import { useEffect, useState } from "react";
import {
  applyAiSuggestion,
  deleteVocabItem,
  enrichVocabItem,
  listVocabSorted
} from "../lib/api";
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
  const [sort, setSort] = useState<"newest" | "smart">("smart");
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadItems(
    nextFilter: ReviewStatus | "all",
    nextSort: "newest" | "smart"
  ) {
    setLoading(true);
    setError(null);

    try {
      const data = await listVocabSorted(nextFilter, nextSort);
      setItems(data.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadItems(filter, sort);
  }, [filter, sort]);

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this phrase?")) {
      return;
    }

    try {
      await deleteVocabItem(id);
      await loadItems(filter, sort);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Delete failed"
      );
    }
  }

  async function handleEnrich(id: number) {
    try {
      await enrichVocabItem(id);
      await loadItems(filter, sort);
    } catch (enrichError) {
      setError(enrichError instanceof Error ? enrichError.message : "AI enrich failed");
    }
  }

  async function handleApplyAi(id: number) {
    try {
      await applyAiSuggestion(id);
      await loadItems(filter, sort);
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "Apply AI failed");
    }
  }

  function toggleExpanded(id: number) {
    setExpandedItems((current) => ({
      ...current,
      [id]: !current[id]
    }));
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
        <div className="filter-row">
          <button
            className={sort === "smart" ? "chip active" : "chip"}
            onClick={() => setSort("smart")}
            type="button"
          >
            smart
          </button>
          <button
            className={sort === "newest" ? "chip active" : "chip"}
            onClick={() => setSort("newest")}
            type="button"
          >
            newest
          </button>
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
              <time>
                {new Date(item.created_at).toLocaleString()} | Smart {item.smart_score}
              </time>
            </div>
            <h3>{item.phrase_text}</h3>
            <p className="compact-meta">
              {item.group_label || "ungrouped"} | {item.tags.length ? item.tags.join(", ") : "no tags"}
            </p>
            {item.note ? <p className="compact-note">{item.note}</p> : null}
            {expandedItems[item.id] ? (
              <>
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
                {item.ai_enrichment ? (
                  <div className="ai-box">
                    <p className="section-kicker">AI Suggestions</p>
                    <p className="muted">
                      Intent: {item.ai_enrichment.usage_intent || "-"} | Difficulty:{" "}
                      {item.ai_enrichment.difficulty} | Priority:{" "}
                      {item.ai_enrichment.review_priority}
                    </p>
                    <p>
                      Correction: {item.ai_enrichment.suggested_correction || "-"}
                    </p>
                    <p className="muted">
                      {item.ai_enrichment.correction_notes || "No correction note"}
                    </p>
                    <p>
                      Suggested group: {item.ai_enrichment.suggested_group_label || "-"}
                    </p>
                    <p>
                      Suggested synonyms:{" "}
                      {item.ai_enrichment.suggested_synonyms.length
                        ? item.ai_enrichment.suggested_synonyms.join(", ")
                        : "-"}
                    </p>
                    <p>
                      Suggested antonyms:{" "}
                      {item.ai_enrichment.suggested_antonyms.length
                        ? item.ai_enrichment.suggested_antonyms.join(", ")
                        : "-"}
                    </p>
                    <p>
                      Example sentence:{" "}
                      {item.ai_enrichment.suggested_example_sentence || "-"}
                    </p>
                    <p className="muted">
                      Context: {item.ai_enrichment.suggested_example_context || "-"}
                    </p>
                  </div>
                ) : null}
              </>
            ) : null}
            {!expandedItems[item.id] && item.ai_enrichment?.suggested_correction ? (
              <div className="ai-box">
                <p className="section-kicker">AI Snapshot</p>
                <p className="compact-note">
                  {item.ai_enrichment.suggested_correction}
                </p>
              </div>
            ) : null}
            <div className="action-row">
              <button className="ghost-button" onClick={() => toggleExpanded(item.id)}>
                {expandedItems[item.id] ? "Less" : "More"}
              </button>
              <button className="ghost-button" onClick={() => void handleEnrich(item.id)}>
                AI enrich
              </button>
              <button
                className="secondary-button"
                disabled={!item.ai_enrichment}
                onClick={() => void handleApplyAi(item.id)}
              >
                Apply AI
              </button>
              <button className="ghost-button" onClick={() => void handleDelete(item.id)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
