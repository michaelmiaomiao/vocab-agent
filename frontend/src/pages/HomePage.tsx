import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  deleteVocabItem,
  deleteVocabByDate,
  enrichVocabItem,
  listVocabSorted,
  mergeVocabItem,
  updateVocabItem
} from "../lib/api";
import type { ReviewStatus, VocabItem } from "@shared/types";

const filters: Array<ReviewStatus | "all"> = [
  "all",
  "new",
  "learning",
  "mastered"
];

type ViewMode = "newest" | "semantic" | "word_type";

interface HomePageProps {
  favoritesOnly?: boolean;
  searchQuery?: string;
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[“”"'`]/g, "")
    .replace(/[.,!?;:()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function expandSearchTokens(value: string) {
  const normalized = normalizeSearchText(value);
  const tokens = normalized.split(" ").filter(Boolean);
  const expanded = new Set<string>(tokens);

  for (const token of tokens) {
    if (token.endsWith("ed") && token.length > 4) expanded.add(token.slice(0, -2));
    if (token.endsWith("ing") && token.length > 5) expanded.add(token.slice(0, -3));
    if (token.endsWith("tion") && token.length > 6) expanded.add(token.slice(0, -4));
    if (token.endsWith("ions") && token.length > 6) expanded.add(token.slice(0, -4));
    if (token.endsWith("s") && token.length > 3) expanded.add(token.slice(0, -1));
    if (token.endsWith("e") && token.length > 4) expanded.add(token.slice(0, -1));
  }

  return [...expanded];
}

function getSearchFields(item: VocabItem) {
  return [
    item.phrase_text,
    item.meaning,
    item.note,
    item.group_label,
    item.source,
    item.tags.join(" "),
    item.synonyms.join(" "),
    item.ai_enrichment?.suggested_meaning,
    item.ai_enrichment?.suggested_group_label,
    item.ai_enrichment?.suggested_word_type,
    item.ai_enrichment?.suggested_synonyms.join(" "),
    item.ai_enrichment?.suggested_antonyms.join(" "),
    item.ai_enrichment?.suggested_example_sentence,
    item.ai_enrichment?.suggested_example_context,
    item.ai_enrichment?.usage_intent
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => normalizeSearchText(value));
}

function getSearchScore(item: VocabItem, rawQuery: string) {
  const query = normalizeSearchText(rawQuery);

  if (!query) {
    return 0;
  }

  const fields = getSearchFields(item);
  const queryTokens = expandSearchTokens(rawQuery);
  let score = 0;

  const phrase = normalizeSearchText(item.phrase_text);
  const meaning = normalizeSearchText(item.meaning || item.ai_enrichment?.suggested_meaning || "");

  if (phrase === query) score += 120;
  if (phrase.startsWith(query)) score += 90;
  if (phrase.includes(query)) score += 70;
  if (meaning.includes(query)) score += 55;

  for (const field of fields) {
    if (field === query) score += 80;
    else if (field.startsWith(query)) score += 50;
    else if (field.includes(query)) score += 30;
  }

  for (const token of queryTokens) {
    if (fields.some((field) => field.includes(token))) {
      score += 18;
    }
  }

  if (queryTokens.length && queryTokens.every((token) => fields.some((field) => field.includes(token)))) {
    score += 40;
  }

  return score;
}

function groupItems(items: VocabItem[], mode: ViewMode) {
  if (mode === "newest") {
    return [{ label: "Latest", items }];
  }

  const groups = new Map<string, VocabItem[]>();

  for (const item of items) {
    const label =
      mode === "semantic"
        ? item.ai_enrichment?.suggested_group_label || item.group_label || "ungrouped"
        : item.ai_enrichment?.suggested_word_type || "untyped";

    const current = groups.get(label) ?? [];
    current.push(item);
    groups.set(label, current);
  }

  return [...groups.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([label, groupedItems]) => ({
      label,
      items: groupedItems
    }));
}

export function HomePage({ favoritesOnly = false, searchQuery = "" }: HomePageProps) {
  const location = useLocation();
  const [items, setItems] = useState<VocabItem[]>([]);
  const [filter, setFilter] = useState<ReviewStatus | "all">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("newest");
  const [deleteDate, setDeleteDate] = useState("");
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [editingItems, setEditingItems] = useState<Record<number, boolean>>({});
  const [busyItems, setBusyItems] = useState<Record<number, "save" | "delete" | "merge" | null>>({});
  const [deletingByDate, setDeletingByDate] = useState(false);
  const [drafts, setDrafts] = useState<
    Record<number, { phrase_text: string; meaning: string; note: string; group_label: string; source: string; merge_target: string }>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function mergeUpdatedItem(updatedItem: VocabItem) {
    setItems((current) => {
      const next = current.map((item) =>
        item.id === updatedItem.id ? updatedItem : item
      );

      next.sort(
        (left, right) =>
          new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
      );

      return next;
    });
  }

  async function loadItems(nextFilter: ReviewStatus | "all") {
    setLoading(true);
    setError(null);

    try {
      const data = await listVocabSorted(nextFilter, "newest");
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

  useEffect(() => {
    void loadItems(filter);
  }, [location.key]);

  useEffect(() => {
    function reloadOnFocus() {
      void loadItems(filter);
    }

    window.addEventListener("focus", reloadOnFocus);
    document.addEventListener("visibilitychange", reloadOnFocus);

    return () => {
      window.removeEventListener("focus", reloadOnFocus);
      document.removeEventListener("visibilitychange", reloadOnFocus);
    };
  }, [filter]);

  async function handleDelete(id: number) {
    setBusyItems((current) => ({ ...current, [id]: "delete" }));

    try {
      await deleteVocabItem(id);
      await loadItems(filter);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Delete failed"
      );
    } finally {
      setBusyItems((current) => ({ ...current, [id]: null }));
    }
  }

  async function handleDeleteByDate() {
    if (!deleteDate) {
      return;
    }

    const start = new Date(`${deleteDate}T00:00:00`);
    const end = new Date(`${deleteDate}T00:00:00`);
    end.setDate(end.getDate() + 1);

    if (!window.confirm(`Delete all items created on ${deleteDate}?`)) {
      return;
    }

    setDeletingByDate(true);

    try {
      const result = await deleteVocabByDate({
        start_at: start.toISOString(),
        end_at: end.toISOString()
      });
      setDeleteDate("");
      setError(null);
      await loadItems(filter);
      if (result.deleted === 0) {
        setError("No items found for that date.");
      }
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Delete by date failed"
      );
    } finally {
      setDeletingByDate(false);
    }
  }

  function toggleExpanded(id: number) {
    setExpandedItems((current) => ({
      ...current,
      [id]: !current[id]
    }));
  }

  function toggleEditing(item: VocabItem) {
    setEditingItems((current) => ({
      ...current,
      [item.id]: !current[item.id]
    }));

    setDrafts((current) => ({
      ...current,
      [item.id]: current[item.id] ?? {
        phrase_text: item.phrase_text,
        meaning: item.meaning || "",
        note: item.note || "",
        group_label: item.group_label || "",
        source: item.source || "",
        merge_target: ""
      }
    }));
  }

  function handleEditKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
    id: number
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleSaveEdit(id);
    }
  }

  async function handleSaveEdit(id: number) {
    const draft = drafts[id];
    if (!draft) return;

    setBusyItems((current) => ({ ...current, [id]: "save" }));

    try {
      await updateVocabItem(id, {
        phrase_text: draft.phrase_text,
        meaning: draft.meaning,
        note: draft.note,
        group_label: draft.group_label,
        source: draft.source
      });
      const refreshed = await enrichVocabItem(id);
      mergeUpdatedItem(refreshed);
      setEditingItems((current) => ({ ...current, [id]: false }));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save failed");
    } finally {
      setBusyItems((current) => ({ ...current, [id]: null }));
    }
  }

  async function handleMergeItem(id: number) {
    const target = drafts[id]?.merge_target?.trim();
    if (!target) return;

    setBusyItems((current) => ({ ...current, [id]: "merge" }));

    try {
      await mergeVocabItem(id, { target: target });
      setEditingItems((current) => ({ ...current, [id]: false }));
      await loadItems(filter);
    } catch (mergeError) {
      setError(mergeError instanceof Error ? mergeError.message : "Merge failed");
    } finally {
      setBusyItems((current) => ({ ...current, [id]: null }));
    }
  }

  const filteredItems = (favoritesOnly ? items.filter((item) => item.favorite) : items)
    .map((item) => ({
      item,
      score: getSearchScore(item, searchQuery)
    }))
    .filter(({ score }) => !searchQuery.trim() || score > 0)
    .sort((left, right) => {
      if (searchQuery.trim() && right.score !== left.score) {
        return right.score - left.score;
      }

      return (
        new Date(right.item.created_at).getTime() - new Date(left.item.created_at).getTime()
      );
    })
    .map(({ item }) => item);

  const visibleItems = filteredItems;
  const groupedItems = groupItems(visibleItems, viewMode);

  async function handleToggleFavorite(item: VocabItem) {
    setBusyItems((current) => ({ ...current, [item.id]: "save" }));

    try {
      const updated = await updateVocabItem(item.id, {
        favorite: !item.favorite
      });
      mergeUpdatedItem(updated);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Favorite update failed");
    } finally {
      setBusyItems((current) => ({ ...current, [item.id]: null }));
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="section-kicker">Vocabulary List</p>
          <h2>{favoritesOnly ? "Favorite phrases" : "Saved phrases"}</h2>
        </div>
        {favoritesOnly ? null : (
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
        )}
        <div className="filter-row">
          <button
            className={viewMode === "newest" ? "chip active" : "chip"}
            onClick={() => setViewMode("newest")}
            type="button"
          >
            newest
          </button>
          <button
            className={viewMode === "semantic" ? "chip active" : "chip"}
            onClick={() => setViewMode("semantic")}
            type="button"
          >
            semantic
          </button>
          <button
            className={viewMode === "word_type" ? "chip active" : "chip"}
            onClick={() => setViewMode("word_type")}
            type="button"
          >
            word type
          </button>
        </div>
        <div className="filter-row delete-date-row">
          <input
            type="date"
            value={deleteDate}
            onChange={(event) => setDeleteDate(event.target.value)}
          />
          <button
            className="ghost-button"
            disabled={!deleteDate || deletingByDate}
            onClick={() => void handleDeleteByDate()}
            type="button"
          >
            {deletingByDate ? "Deleting..." : "Delete by date"}
          </button>
        </div>
      </div>

      {error ? <p className="error-banner">{error}</p> : null}
      {loading ? <p className="muted">Loading phrases...</p> : null}
      {!loading && visibleItems.length === 0 ? (
        <p className="muted">
          {favoritesOnly
            ? searchQuery
              ? "No favorite matches for this search."
              : "No favorites yet. Star a few phrases from the list."
            : searchQuery
              ? "No phrases match this search yet."
              : "No phrases yet. Capture one on the next tab."}
        </p>
      ) : null}

      {groupedItems.map((group) => (
        <section className="group-section" key={group.label}>
          {viewMode !== "newest" ? (
            <div className="group-header">
              <p className="section-kicker">Group</p>
              <h3>{group.label}</h3>
            </div>
          ) : null}
          <div className="list-grid">
            {group.items.map((item) => (
              <article className="vocab-row" key={item.id}>
                <div className="row-main">
                  <div className="card-topline">
                    <div className="topline-badges">
                      <button
                        className={item.favorite ? "star-button active" : "star-button"}
                        disabled={busyItems[item.id] === "save"}
                        onClick={() => void handleToggleFavorite(item)}
                        type="button"
                      >
                        {item.favorite ? "★" : "☆"}
                      </button>
                      <span className={`status-pill ${item.review_status}`}>
                        {item.review_status}
                      </span>
                    </div>
                    <time>{new Date(item.created_at).toLocaleString()}</time>
                  </div>
                  <h3>{item.phrase_text}</h3>
                  <p className="compact-meta">
                    {item.group_label || item.ai_enrichment?.suggested_group_label || "ungrouped"}
                    {item.source ? ` | ${item.source}` : ""}
                  </p>
                  {item.meaning ? <p className="compact-note">{item.meaning}</p> : null}
                  {item.note ? <p className="compact-note">{item.note}</p> : null}
                  {item.ai_enrichment ? (
                    <div className="ai-box">
                      <p className="section-kicker">AI Snapshot</p>
                      <p className="compact-note">
                        {item.meaning ||
                          item.ai_enrichment.suggested_meaning ||
                          item.ai_enrichment.suggested_example_sentence ||
                          item.ai_enrichment.suggested_correction ||
                          "AI suggestion ready"}
                      </p>
                      {item.ai_enrichment.suggested_example_sentence ? (
                        <p className="muted compact-preview-line">
                          {item.ai_enrichment.suggested_example_sentence}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {expandedItems[item.id] && item.ai_enrichment ? (
                    <div className="ai-box">
                      <p className="section-kicker">AI Details</p>
                      <p className="muted">
                        Intent: {item.ai_enrichment.usage_intent || "-"} | Difficulty:{" "}
                        {item.ai_enrichment.difficulty}
                      </p>
                      <p>Correction: {item.ai_enrichment.suggested_correction || "-"}</p>
                      <p className="muted">
                        {item.ai_enrichment.correction_notes || "No correction note"}
                      </p>
                      <p>Word type: {item.ai_enrichment.suggested_word_type || "-"}</p>
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
                    </div>
                  ) : null}
                  {editingItems[item.id] ? (
                    <div className="ai-box">
                      <p className="section-kicker">Modify</p>
                      <label>
                        Phrase
                        <input
                          value={drafts[item.id]?.phrase_text || ""}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [item.id]: {
                                ...current[item.id],
                                phrase_text: event.target.value
                              }
                            }))
                          }
                          onKeyDown={(event) => handleEditKeyDown(event, item.id)}
                        />
                      </label>
                      <label>
                        Meaning
                        <input
                          value={drafts[item.id]?.meaning || ""}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [item.id]: {
                                ...current[item.id],
                                meaning: event.target.value
                              }
                            }))
                          }
                          onKeyDown={(event) => handleEditKeyDown(event, item.id)}
                        />
                      </label>
                      <label>
                        Note
                        <input
                          value={drafts[item.id]?.note || ""}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [item.id]: {
                                ...current[item.id],
                                note: event.target.value
                              }
                            }))
                          }
                          onKeyDown={(event) => handleEditKeyDown(event, item.id)}
                        />
                      </label>
                      <label>
                        Group
                        <input
                          value={drafts[item.id]?.group_label || ""}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [item.id]: {
                                ...current[item.id],
                                group_label: event.target.value
                              }
                            }))
                          }
                          onKeyDown={(event) => handleEditKeyDown(event, item.id)}
                        />
                      </label>
                      <label>
                        Source
                        <input
                          value={drafts[item.id]?.source || ""}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [item.id]: {
                                ...current[item.id],
                                source: event.target.value
                              }
                            }))
                          }
                          onKeyDown={(event) => handleEditKeyDown(event, item.id)}
                        />
                      </label>
                      <label>
                        Merge into
                        <input
                          placeholder="Target phrase or item ID"
                          value={drafts[item.id]?.merge_target || ""}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [item.id]: {
                                ...current[item.id],
                                merge_target: event.target.value
                              }
                            }))
                          }
                        />
                      </label>
                      <div className="action-row">
                        <button
                          className="secondary-button"
                          disabled={busyItems[item.id] === "save"}
                          onClick={() => void handleSaveEdit(item.id)}
                          type="button"
                        >
                          {busyItems[item.id] === "save" ? "Saving..." : "Save"}
                        </button>
                        <button
                          className="ghost-button"
                          disabled={busyItems[item.id] === "merge" || !drafts[item.id]?.merge_target.trim()}
                          onClick={() => void handleMergeItem(item.id)}
                          type="button"
                        >
                          {busyItems[item.id] === "merge" ? "Merging..." : "Merge"}
                        </button>
                        <button
                          className="ghost-button"
                          onClick={() => toggleEditing(item)}
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="row-actions">
                  <button className="ghost-button" onClick={() => toggleExpanded(item.id)} type="button">
                    {expandedItems[item.id] ? "Less" : "More"}
                  </button>
                  <button className="ghost-button" onClick={() => toggleEditing(item)} type="button">
                    {editingItems[item.id] ? "Close" : "Modify"}
                  </button>
                  <button
                    className="ghost-button"
                    disabled={busyItems[item.id] === "delete"}
                    onClick={() => void handleDelete(item.id)}
                    type="button"
                  >
                    {busyItems[item.id] === "delete" ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}
