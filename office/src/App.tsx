import type { Game as PhaserGame } from "phaser";
import type { OfficeScene } from "@/game/scenes/OfficeScene";
import type { OfficeAgentView } from "@/types/office";
import { useEffect, useMemo, useRef, useState } from "react";
import { useOfficeWorldData } from "@/hooks/useOfficeWorldData";
import { buildActionInboxItems } from "@/lib/action-inbox";
import {
  buildAgentTrackerUrl,
  buildApprovalTrackerUrl,
  buildIssueTrackerUrl,
  buildTrackerCompanyUrl,
  buildTrackerHomeUrl,
  resolveTrackerOrigin,
} from "@/lib/tracker-links";
import { deriveOfficeAgents } from "@/lib/world-state";
import { OfficeShell } from "@/ui/OfficeShell";
import { HireModal } from "@/ui/components/HireModal";
import { useOfficeActions } from "@/ui/useOfficeActions";

type OfficeGameHandle = PhaserGame;

export function App() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<OfficeGameHandle | null>(null);
  const previousViewsRef = useRef(new Map<string, OfficeAgentView>());
  const officeAgentsRef = useRef<OfficeAgentView[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [dismissedActionIds, setDismissedActionIds] = useState<string[]>([]);
  const [hireModalOpen, setHireModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const companyId = useMemo(resolveOfficeCompanyId, []);
  const trackerOrigin = useMemo(
    () => resolveTrackerOrigin(getLocationOrigin(), import.meta.env.VITE_TRACKER_ORIGIN),
    [],
  );
  const { data, error, isFetching, isLoading, refetch } = useOfficeWorldData(companyId);
  const effectiveCompanyId = data?.company.id ?? companyId;
  const actions = useOfficeActions(effectiveCompanyId);

  const officeAgents = useMemo(() => {
    if (!data) {
      return [];
    }

    const nextViews = deriveOfficeAgents({
      agents: data.agents,
      issues: data.issues,
      approvals: data.approvals,
      activity: data.activity,
      previous: previousViewsRef.current,
      now: Date.now(),
    });

    previousViewsRef.current = new Map(nextViews.map((view) => [view.agentId, view]));
    return nextViews;
  }, [data]);

  officeAgentsRef.current = officeAgents;

  const selectedAgent = useMemo(
    () => officeAgents.find((agent) => agent.agentId === selectedAgentId) ?? null,
    [officeAgents, selectedAgentId],
  );
  const selectedAgentRecord = useMemo(
    () => data?.agents.find((agent) => agent.id === selectedAgentId) ?? null,
    [data, selectedAgentId],
  );
  const actionQueue = useMemo(() => {
    if (!data) {
      return [];
    }

    return buildActionInboxItems({
      approvals: data.approvals,
      activity: data.activity,
      issues: data.issues,
    }).filter((item) => !dismissedActionIds.includes(item.id));
  }, [data, dismissedActionIds]);
  const currentAction = actionQueue[0] ?? null;
  const queuedActionCount = Math.max(actionQueue.length - 1, 0);
  const trackerCompanyUrl = useMemo(
    () => (data ? buildTrackerCompanyUrl(trackerOrigin, data.company) : null),
    [data, trackerOrigin],
  );
  const trackerHomeUrl = useMemo(
    () => (trackerCompanyUrl ? buildTrackerHomeUrl(trackerCompanyUrl) : `${trackerOrigin}/`),
    [trackerCompanyUrl, trackerOrigin],
  );
  const stageStatus = useMemo(() => {
    if (actionError) {
      return "Action failed";
    }
    if (error) {
      return "Sync issue";
    }
    if (!companyId) {
      return "Waiting for company";
    }
    if (isLoading && !data) {
      return "Connecting";
    }
    if (isFetching) {
      return "Syncing";
    }
    if (data) {
      return `${data.agents.length} agents live`;
    }
    return "Workspace ready";
  }, [actionError, companyId, data, error, isFetching, isLoading]);
  const stageHint = useMemo(() => {
    if (actionError) {
      return actionError;
    }
    if (error instanceof Error) {
      return error.message;
    }
    if (!companyId) {
      return "Open the office from the tracker shortcut so the selected company is carried into the room.";
    }
    if (selectedAgent) {
      return `Arrow keys move the operator. Press E near an agent to inspect them. Selected: ${selectedAgent.name}.`;
    }
    return "Arrow keys move the operator. Press E near an agent to inspect them.";
  }, [actionError, companyId, error, selectedAgent]);

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
        (game.scene.getScene("office") as OfficeScene).syncAgents(officeAgentsRef.current);
      } catch (error) {
        console.error("Failed to boot Paperclip Office.", error);
        gameRef.current = null;
      }
    }).catch((error) => {
      console.error("Failed to load Paperclip Office game bundle.", error);
    });

    return () => {
      active = false;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    const scene = gameRef.current?.scene.getScene("office") as OfficeScene | undefined;
    scene?.syncAgents(officeAgents);
  }, [officeAgents]);

  useEffect(() => {
    if (!selectedAgentId) {
      return;
    }

    if (!officeAgents.some((agent) => agent.agentId === selectedAgentId)) {
      setSelectedAgentId(null);
    }
  }, [officeAgents, selectedAgentId]);

  async function runOfficeAction(action: () => Promise<void>) {
    setActionError(null);

    try {
      await action();
      await refetch();
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error ? caughtError.message : "Office action failed.",
      );
    }
  }

  function openTracker(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleOpenTrackerHome() {
    openTracker(trackerHomeUrl);
  }

  function handleOpenTicket() {
    if (!selectedAgent?.issue || !trackerCompanyUrl) {
      return;
    }

    openTracker(buildIssueTrackerUrl(trackerCompanyUrl, selectedAgent.issue));
  }

  function handleOpenAgentTracker() {
    if (!selectedAgent || !trackerCompanyUrl) {
      return;
    }

    openTracker(
      buildAgentTrackerUrl(
        trackerCompanyUrl,
        selectedAgentRecord ?? { id: selectedAgent.agentId, name: selectedAgent.name },
      ),
    );
  }

  function handleDismissAction() {
    if (!currentAction) {
      return;
    }

    setDismissedActionIds((items) => [...items, currentAction.id]);
  }

  function handleOpenActionContext() {
    if (!currentAction || !trackerCompanyUrl) {
      openTracker(trackerHomeUrl);
      return;
    }

    if (currentAction.issueId) {
      openTracker(buildIssueTrackerUrl(trackerCompanyUrl, { id: currentAction.issueId }));
      return;
    }

    if (currentAction.approvalId) {
      openTracker(buildApprovalTrackerUrl(trackerCompanyUrl, { id: currentAction.approvalId }));
      return;
    }

    openTracker(trackerHomeUrl);
  }

  async function handlePauseToggle() {
    if (!selectedAgent) {
      return;
    }

    await runOfficeAction(async () => {
      if (selectedAgent.status === "paused") {
        await actions.resume(selectedAgent.agentId);
        return;
      }

      await actions.pause(selectedAgent.agentId);
    });
  }

  async function handleFire() {
    if (!selectedAgent) {
      return;
    }

    await runOfficeAction(async () => {
      await actions.fire(selectedAgent.agentId);
      setSelectedAgentId(null);
    });
  }

  async function handleChat(body: string) {
    if (!selectedAgent?.issue?.id || body.trim().length === 0) {
      return;
    }

    await runOfficeAction(async () => {
      await actions.chat(selectedAgent.issue!.id, body);
    });
  }

  async function handleApproveAction() {
    if (!currentAction?.approvalId) {
      return;
    }

    const approvalId = currentAction.approvalId;
    const dismissedActionId = currentAction.id;

    await runOfficeAction(async () => {
      await actions.approve(approvalId);
      setDismissedActionIds((items) => [...items, dismissedActionId]);
    });
  }

  async function handleHire(payload: Parameters<typeof actions.hireAndApprove>[0]) {
    await runOfficeAction(async () => {
      await actions.hireAndApprove(payload);
      setHireModalOpen(false);
    });
  }

  return (
    <main className="office-app">
      <OfficeShell
        companyName={data?.company.name ?? null}
        stageStatus={stageStatus}
        stageHint={stageHint}
        currentAction={currentAction}
        queuedActionCount={queuedActionCount}
        selectedAgent={selectedAgent}
        canHire={Boolean(effectiveCompanyId)}
        onOpenHire={() => setHireModalOpen(true)}
        onOpenTrackerHome={handleOpenTrackerHome}
        onApproveAction={() => {
          void handleApproveAction();
        }}
        onOpenActionContext={handleOpenActionContext}
        onDismissAction={handleDismissAction}
        onCloseAgentDialog={() => setSelectedAgentId(null)}
        onPauseToggle={() => {
          void handlePauseToggle();
        }}
        onFire={() => {
          void handleFire();
        }}
        onChat={(body) => {
          void handleChat(body);
        }}
        onOpenTicket={handleOpenTicket}
        onOpenAgentTracker={handleOpenAgentTracker}
      >
        <div
          ref={stageRef}
          className="office-stage-canvas"
          aria-label="Phaser office stage"
          style={{ width: "100%", maxWidth: 768, minHeight: 384, margin: "0 auto" }}
        />
      </OfficeShell>

      <HireModal
        open={hireModalOpen}
        defaultAdapterType={data?.agents[0]?.adapterType ?? "codex_local"}
        onClose={() => setHireModalOpen(false)}
        onSubmit={handleHire}
      />
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

function resolveOfficeCompanyId() {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search).get("companyId");
}

function getLocationOrigin() {
  if (typeof window === "undefined") {
    return "http://localhost";
  }

  return window.location.origin;
}
