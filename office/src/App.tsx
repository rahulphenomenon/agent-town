import type { Game as PhaserGame } from "phaser";
import { AGENT_ROLE_LABELS } from "@paperclipai/shared";
import type { OfficeScene } from "@/game/scenes/OfficeScene";
import type { OfficeAgentView, OfficeSnapshot } from "@/types/office";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
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
import {
  getNextSoundtrackStep,
  syncSoundtrackPlayback,
} from "@/lib/soundtrack";
import { OfficeShell } from "@/ui/OfficeShell";
import { HireModal } from "@/ui/components/HireModal";
import { useOfficeActions } from "@/ui/useOfficeActions";

type OfficeGameHandle = PhaserGame;

export function App() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<OfficeGameHandle | null>(null);
  const soundtrackRef = useRef<HTMLAudioElement | null>(null);
  const previousViewsRef = useRef(new Map<string, OfficeAgentView>());
  const officeAgentsRef = useRef<OfficeAgentView[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [dismissedActionIds, setDismissedActionIds] = useState<string[]>([]);
  const [hireModalOpen, setHireModalOpen] = useState(false);
  const [companyBoardOpen, setCompanyBoardOpen] = useState(false);
  const [soundStepIndex, setSoundStepIndex] = useState(2);
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
  const missionBrief = useMemo(() => buildMissionBrief(data), [data]);
  const companyBoard = useMemo(() => buildCompanyBoard(data), [data]);
  const statCards = useMemo(
    () => buildStatCards(data, officeAgents, actionQueue.length),
    [actionQueue.length, data, officeAgents],
  );
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
    if (data) {
      return actionQueue.length > 0
        ? `${actionQueue.length} boss task${actionQueue.length === 1 ? "" : "s"} waiting`
        : `${data.agents.length} crew on the floor`;
    }
    if (isFetching) {
      return "Syncing";
    }
    return "Workspace ready";
  }, [actionError, actionQueue.length, companyId, data, error, isFetching, isLoading]);
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
    if (hireModalOpen) {
      return "Recruiting mode is open. Submit a new hire to send them through the front door.";
    }
    if (selectedAgent) {
      return `Desk chat open with ${selectedAgent.name}. Close the card to get back on the floor.`;
    }
    return "Use WASD or arrow keys to move. Hold Space to sprint. Press E near a teammate to open their desk card.";
  }, [actionError, companyId, error, hireModalOpen, selectedAgent]);

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
          onInteractAgent: (agentId) => {
            setCompanyBoardOpen(false);
            setSelectedAgentId(agentId);
          },
          onInteractHotspot: (hotspotId) => {
            if (hotspotId === "company-board") {
              setSelectedAgentId(null);
              setCompanyBoardOpen(true);
            }
          },
        });
        gameRef.current = game;
        syncOfficeSceneWhenReady(game, (scene) => {
          scene.syncAgents(officeAgentsRef.current);
        });
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
    const scene = getOfficeScene(gameRef.current);
    scene?.syncAgents(officeAgents);
  }, [officeAgents]);

  useEffect(() => {
    const scene = getOfficeScene(gameRef.current);
    scene?.setControlsLocked(
      Boolean(
        selectedAgentId
        || hireModalOpen
        || companyBoardOpen
        || currentAction?.kind === "approval",
      ),
    );
  }, [companyBoardOpen, currentAction?.kind, hireModalOpen, selectedAgentId]);

  useEffect(() => {
    const soundtrack = soundtrackRef.current;

    if (!soundtrack) {
      return;
    }

    void syncSoundtrackPlayback(soundtrack, soundStepIndex);
  }, [soundStepIndex]);

  useEffect(() => {
    return () => {
      soundtrackRef.current?.pause();
    };
  }, []);

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

  async function handleOpenHire() {
    setCompanyBoardOpen(false);
    setSelectedAgentId(null);

    const scene = getOfficeScene(gameRef.current);
    const hiringLeadId = resolveHiringLeadId(data, officeAgents);

    if (scene && hiringLeadId) {
      await scene.walkPlayerToAgent(hiringLeadId);
    }

    setHireModalOpen(true);
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

    const agentId = selectedAgent.agentId;

    await runOfficeAction(async () => {
      flushSync(() => {
        setSelectedAgentId(null);
      });

      const scene = getOfficeScene(gameRef.current);
      if (scene) {
        await scene.playFireSequence(agentId);
      }

      await actions.fire(agentId);
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
        missionTitle={missionBrief.title}
        missionSummary={missionBrief.summary}
        missionItems={missionBrief.items}
        stageStatus={stageStatus}
        stageHint={stageHint}
        statCards={statCards}
        currentAction={currentAction}
        queuedActionCount={queuedActionCount}
        selectedAgent={selectedAgent}
        canHire={Boolean(effectiveCompanyId)}
        companyBoard={companyBoard}
        companyBoardOpen={companyBoardOpen}
        onOpenCompanyBoard={() => setCompanyBoardOpen(true)}
        onCloseCompanyBoard={() => setCompanyBoardOpen(false)}
        soundStepIndex={soundStepIndex}
        onOpenHire={() => {
          void handleOpenHire();
        }}
        onToggleSound={() => setSoundStepIndex((currentStepIndex) => getNextSoundtrackStep(currentStepIndex))}
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
        />
      </OfficeShell>

      <audio
        ref={soundtrackRef}
        className="office-soundtrack"
        src="/audio/soundtrack.mp3"
        loop
        preload="auto"
      />

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

function getOfficeScene(game: OfficeGameHandle | null) {
  if (!game) {
    return null;
  }

  try {
    const scene = game.scene.getScene("office") as OfficeScene;
    return scene.isReady ? scene : null;
  } catch {
    return null;
  }
}

function syncOfficeSceneWhenReady(game: OfficeGameHandle, onReady: (scene: OfficeScene) => void) {
  const readyScene = getOfficeScene(game);
  if (readyScene) {
    onReady(readyScene);
    return;
  }

  const handleReady = (scene: OfficeScene) => {
    game.events.off("office-scene-ready", handleReady);
    onReady(scene);
  };

  game.events.on("office-scene-ready", handleReady);
}

function resolveHiringLeadId(
  snapshot: OfficeSnapshot | undefined,
  officeAgents: OfficeAgentView[],
) {
  if (!snapshot) {
    return null;
  }

  const hiringLead =
    snapshot.agents.find((agent) => agent.permissions.canCreateAgents)
    ?? snapshot.agents.find((agent) => agent.role === "ceo")
    ?? snapshot.agents[0]
    ?? null;

  if (!hiringLead) {
    return null;
  }

  return officeAgents.find((agent) => agent.agentId === hiringLead.id)?.agentId ?? hiringLead.id;
}

function buildMissionBrief(snapshot: OfficeSnapshot | undefined) {
  if (!snapshot) {
    return {
      title: "Paperclip Office",
      summary: "A retro control surface for walking the floor, clearing approvals, and keeping AI agents aligned to the company mission.",
      items: [
        "Open the office from Tracker to pin a company here.",
        "Approvals and hires surface as in-world boss tasks.",
        "Agents move between desks, chat nook, and lounge based on Paperclip state.",
      ],
    };
  }

  const levelPriority = new Map([
    ["company", 0],
    ["team", 1],
    ["agent", 2],
    ["task", 3],
  ]);

  const sortedGoals = [...snapshot.goals].sort((left, right) => {
    const leftPriority = levelPriority.get(left.level) ?? 10;
    const rightPriority = levelPriority.get(right.level) ?? 10;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return right.updatedAt.getTime() - left.updatedAt.getTime();
  });

  const missionGoal =
    sortedGoals.find((goal) => goal.level === "company" && goal.status !== "cancelled")
    ?? sortedGoals[0]
    ?? null;
  const goalItems = sortedGoals
    .filter((goal) => goal.id !== missionGoal?.id && goal.status === "active")
    .slice(0, 2)
    .map((goal) => goal.title);
  const issueItems = [...snapshot.issues]
    .filter((issue) => issue.status === "in_progress" || issue.status === "blocked" || issue.status === "todo")
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
    .map((issue) => (issue.identifier ? `${issue.identifier}: ${issue.title}` : issue.title));
  const items = [...goalItems, ...issueItems].slice(0, 3);

  return {
    title: missionGoal?.title ?? `${snapshot.company.name} office shift`,
    summary:
      missionGoal?.description
      ?? snapshot.company.description
      ?? `Walk the floor for ${snapshot.company.name}, keep work moving, and jump to Tracker when you need the full audit trail.`,
    items:
      items.length > 0
        ? items
        : [
            "No active goals are pinned yet.",
            "Create a company goal in Tracker to anchor the office mission board.",
          ],
  };
}

function buildCompanyBoard(snapshot: OfficeSnapshot | undefined) {
  if (!snapshot) {
    return {
      companyName: "Paperclip Office",
      goals: ["No company selected."],
      staff: [],
    };
  }

  const activeGoals = snapshot.goals
    .filter((goal) => goal.status === "active")
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
    .slice(0, 4)
    .map((goal) => goal.title);

  const staff = [...snapshot.agents]
    .sort((left, right) => {
      const leftLead = left.permissions.canCreateAgents ? 0 : 1;
      const rightLead = right.permissions.canCreateAgents ? 0 : 1;
      if (leftLead !== rightLead) {
        return leftLead - rightLead;
      }

      return left.name.localeCompare(right.name);
    })
    .map((agent) => ({
      id: agent.id,
      name: agent.name,
      role: humanizeRole(agent.role, agent.title),
      status: agent.status,
      isLead: agent.permissions.canCreateAgents,
    }));

  return {
    companyName: snapshot.company.name,
    goals: activeGoals.length > 0 ? activeGoals : ["No active company goals yet."],
    staff,
  };
}

function buildStatCards(
  snapshot: OfficeSnapshot | undefined,
  officeAgents: OfficeAgentView[],
  actionQueueLength: number,
) {
  if (!snapshot) {
    return [
      { label: "Crew", value: "--" },
      { label: "Busy", value: "--" },
      { label: "Alerts", value: "--" },
      { label: "Queue", value: "--" },
    ];
  }

  const busyCount = officeAgents.filter((agent) =>
    agent.intent.mode === "heading_to_desk"
    || agent.intent.mode === "working_at_desk"
    || agent.intent.mode === "talking",
  ).length;
  const alertCount = officeAgents.filter((agent) => agent.intent.mode === "needs_attention").length;

  return [
    { label: "Crew", value: String(snapshot.agents.length) },
    { label: "Busy", value: String(busyCount) },
    { label: "Alerts", value: String(alertCount) },
    { label: "Queue", value: String(actionQueueLength) },
  ];
}

function humanizeRole(role: string | null | undefined, title: string | null | undefined) {
  if (title) {
    return title;
  }

  if (!role) {
    return "Operator";
  }

  if (role in AGENT_ROLE_LABELS) {
    return AGENT_ROLE_LABELS[role as keyof typeof AGENT_ROLE_LABELS];
  }

  return role
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
