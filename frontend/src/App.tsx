import { NavLink, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { CapturePage } from "./pages/CapturePage";
import { ReviewPage } from "./pages/ReviewPage";

export function App() {
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
          <NavLink to="/capture">Capture</NavLink>
          <NavLink to="/review">Review</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/capture" element={<CapturePage />} />
          <Route path="/review" element={<ReviewPage />} />
        </Routes>
      </main>
    </div>
  );
}
