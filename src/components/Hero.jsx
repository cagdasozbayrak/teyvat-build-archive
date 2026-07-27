export default function Hero({ stats }) {
  const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
  return (
    <header className="hero">
      <div className="hero-mark" aria-hidden>✦</div>
      <div>
        <p className="eyebrow">Traveler's Ledger</p>
        <h1>Teyvat Build Archive</h1>
        <p className="sub">Track talents and artifacts for every character you're building.</p>
      </div>
      <div className="hero-stats">
        <div><b>{stats.chars}</b><span>characters</span></div>
        <div><b>{stats.fully}</b><span>fully built</span></div>
        <div><b>{pct}%</b><span>complete</span></div>
      </div>
    </header>
  );
}
