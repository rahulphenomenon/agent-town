export function App() {
  return (
    <main className="office-app">
      <header className="office-shell">
        <div className="office-brand">
          <p className="office-eyebrow">Paperclip control surface</p>
          <h1>Paperclip Office</h1>
          <p className="office-summary">
            Track the company, steer the work, and jump to the issue tracker
            when you need the full audit trail.
          </p>
        </div>
        <button type="button" className="office-button">
          View in Tracker
        </button>
      </header>

      <section className="office-stage" aria-label="Office workspace">
        <div className="office-panel">
          <span className="office-status">Workspace ready</span>
          <p>Bootstrapping the board view and agent cockpit.</p>
        </div>
      </section>
    </main>
  );
}
