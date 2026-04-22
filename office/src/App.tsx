import type { Game as PhaserGame } from "phaser";
import { useEffect, useRef, useState } from "react";

type OfficeGameHandle = PhaserGame;

export function App() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<OfficeGameHandle | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  useEffect(() => {
    const stageElement = stageRef.current;

    if (!stageElement || gameRef.current || !supportsOfficeGame()) {
      return undefined;
    }

    let active = true;

    void import("./game/createOfficeGame").then(({ createOfficeGame }) => {
      if (!active || !stageRef.current || gameRef.current) {
        return;
      }

      try {
        const game = createOfficeGame(stageRef.current, {
          onInteractAgent: setSelectedAgentId,
        });
        gameRef.current = game;
      } catch {
        gameRef.current = null;
      }
    });

    return () => {
      active = false;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

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
          <p>Arrow keys move the operator. E is reserved for future agent actions.</p>
          <p>Selected agent: {selectedAgentId ?? "none"}</p>
          <div
            ref={stageRef}
            aria-label="Phaser office stage"
            style={{ width: "100%", minHeight: 384 }}
          />
        </div>
      </section>
    </main>
  );
}

function supportsOfficeGame() {
  if (typeof document === "undefined") {
    return false;
  }

  if (typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom")) {
    return false;
  }

  const canvas = document.createElement("canvas");

  try {
    return Boolean(canvas.getContext("2d"));
  } catch {
    return false;
  }
}
