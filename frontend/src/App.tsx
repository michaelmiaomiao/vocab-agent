import { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { CapturePage } from "./pages/CapturePage";
import { BulkImportPage } from "./pages/BulkImportPage";
import { ReviewPage } from "./pages/ReviewPage";
import type { PronunciationAccent } from "./lib/pronunciation";

const accentOptions: Array<{ label: string; value: PronunciationAccent }> = [
  { label: "US", value: "en-US" },
  { label: "UK", value: "en-GB" }
];

export function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [accent, setAccent] = useState<PronunciationAccent>(() => {
    if (typeof window === "undefined") {
      return "en-US";
    }

    const saved = window.localStorage.getItem("pronunciation-accent");
    return saved === "en-GB" ? "en-GB" : "en-US";
  });

  useEffect(() => {
    window.localStorage.setItem("pronunciation-accent", accent);
  }, [accent]);

  return (
    <div className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Personal Business English</p>
          <h1>Vocab Agent</h1>
          <p className="hero-copy">
            Capture practical English phrases, group them by communication
            intent, and review them before your next meeting or email thread.
          </p>
        </div>
        <nav className="nav">
          <NavLink to="/" end>
            List
          </NavLink>
          <NavLink to="/favorites">Favorites</NavLink>
          <NavLink to="/capture">Capture</NavLink>
          <NavLink to="/bulk-import">Bulk Import</NavLink>
          <NavLink to="/review">Review</NavLink>
        </nav>
        <div className="accent-picker">
          <span className="section-kicker">Pronunciation</span>
          <div className="filter-row">
            {accentOptions.map((option) => (
              <button
                key={option.value}
                className={accent === option.value ? "chip active" : "chip"}
                onClick={() => setAccent(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <label className="hero-search">
          <span className="section-kicker">Search</span>
          <input
            placeholder="Search English, 中文, synonyms, meaning..."
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>
      </header>
      <main>
        <Routes>
          <Route
            path="/"
            element={<HomePage pronunciationAccent={accent} searchQuery={searchQuery} />}
          />
          <Route
            path="/favorites"
            element={
              <HomePage
                favoritesOnly
                pronunciationAccent={accent}
                searchQuery={searchQuery}
              />
            }
          />
          <Route path="/capture" element={<CapturePage />} />
          <Route path="/bulk-import" element={<BulkImportPage />} />
          <Route path="/review" element={<ReviewPage pronunciationAccent={accent} />} />
        </Routes>
      </main>
    </div>
  );
}
