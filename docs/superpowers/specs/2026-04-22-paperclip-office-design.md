# Paperclip Office UI Design

Date: 2026-04-22
Topic: Game-like office UI for Paperclip
Status: Approved for planning

## Goal

Build a game-like office UI on top of Paperclip that lets a human "boss" walk around an office, inspect AI agents, chat with them, hire and fire them, and understand what they are doing at a glance.

This is a new UI layer over Paperclip, not a rewrite of Paperclip's backend or coordination model.

## Product Summary

The product is a top-down, keyboard-controlled office scene inspired by Gather, Pokemon-style movement, and spatial collaboration tools. The office is a visual projection of Paperclip's state.

The player controls a boss avatar and can:

- walk around the office with collisions
- approach an agent and press `E` to interact
- see what the agent is working on
- post feedback to the relevant ticket
- hire a new agent through an in-game popup
- fire an agent and watch them get removed from the office
- open the standard Paperclip UI in a new tab for deeper control

The demo should prioritize:

- speed of implementation
- reliable behavior for a live demo
- delight and legibility

## Non-Goals

The following are explicitly out of scope for v1:

- changing Paperclip's backend coordination model
- introducing a new backend such as Convex
- multiplayer or shared worlds
- voice input or voice output
- rebuilding the full Paperclip tracker UI inside the world
- exact physical synchronization between backend state changes and character motion
- freeform AI roaming or simulation-heavy behaviors

## Recommendation Summary

Use a fork of Paperclip and add a separate game frontend inside the same repo.

Keep Paperclip as the source of truth for:

- agents
- issues and comments
- approvals and hire flow
- dashboard summary
- activity
- agent pause, resume, and termination actions

Build the office UI as a new frontend that talks to Paperclip over its existing REST API. Use polling for world synchronization in v1. Revisit pushed live updates later.

## Why This Architecture

Paperclip already exposes the needed control-plane primitives through its documented REST API. The fastest and safest hackathon path is to build a spatial UI on top of that API rather than introducing a second backend or changing Paperclip internals.

This avoids inheriting architectural constraints from other projects:

- `pixel-agents` is built around a VS Code extension and transcript observation
- `agent-town` is built around OpenClaw and its runtime protocol
- `AI Town` is built around Convex and simulation-heavy world state
- WorkAdventure is a useful reference for movement feel and map design, but it is not needed as a runtime dependency

## Reuse Strategy

The office UI should be built as a fresh implementation tailored to Paperclip.

Other repositories are reference sources, not runtime foundations.

Use them selectively:

- `Paperclip`: backend, auth/session behavior, entities, actions, source of truth
- `agent-town`: reference for walkable-office interaction loops, Phaser scene structure, proximity interaction, and HUD layering
- `pixel-agents`: reference for office assets, status visualization, character animation cues, and environmental styling
- `WorkAdventure`: reference for top-down office map conventions and Tiled-style workflow
- `AI Town`: optional inspiration for music and scene ambiance

Document all borrowed assets and copied or adapted code in:

- `README.md`
- `ATTRIBUTION.md`

## Technical Architecture

### Repo Shape

Fork Paperclip and add a separate game frontend inside the same repo or monorepo.

Paperclip's existing server remains unchanged and continues to provide the control plane.

### Frontend Stack

Use:

- `Phaser 3` for world rendering, keyboard movement, collisions, pathing, sprite animation, and map logic
- `React` for overlay UI, dialogs, popups, and control panels

This gives the right shape for a playable world while keeping panel-style UI easy to build.

### Data Access

Use Paperclip's REST API for:

- initial load
- user actions
- background sync

Recommended sync model for v1:

- initial load through REST
- background polling every 1-2 seconds for lightweight world state
- slower fetches for heavier detail only when needed
- immediate refetch after user actions

Do not depend on undocumented live-update internals for v1.

### High-Level Data Flow

1. Load company, agents, issues, approvals, dashboard summary, and recent activity from Paperclip.
2. Map Paperclip records to simplified world states.
3. Render those states in the office scene.
4. Let the player trigger actions from in-world dialogs.
5. Send mutations back to Paperclip via REST.
6. Poll again and update the office state.

## World Model

The office is not an independent simulation. It is a spatial projection of Paperclip state.

Each Paperclip agent maps to a single in-world character.

### Agent Spatial States

- `idle`: stand near the water cooler
- `heading_to_desk`: move from current position toward a desk after assignment or status change
- `working_at_desk`: stand or animate at desk/computer
- `paused_asleep`: asleep on a couch or bean bag
- `needs_attention`: alert treatment near the desk for blocked/error/waiting states
- `talking`: two agents stand near each other with one shared speech bubble between them
- `terminated`: firing animation then removal from the world

### State Mapping Rules

- agent status `running` or relevant issue state `in_progress` maps to active work behavior
- agent status `idle` maps to water-cooler placement
- agent status `paused` maps to asleep-on-couch placement
- blocked or error-like signals map to `needs_attention`
- recent collaboration signals from comments, mentions, approvals, or related activity can map to temporary `talking`

### Visual Intent Layer

Paperclip state changes may happen faster than character motion. The world should handle this gracefully rather than trying to mirror exact backend timing.

The client uses a visual intent layer:

- backend state changes immediately
- the world shows the next believable action
- if an agent gets work, they can enter `heading_to_desk` even if the backend already started execution
- if the backend finishes quickly, the character still completes a short readable transition before settling into the next appropriate state

The goal is legibility and delight, not exact physical accuracy.

## User Flows

### Core Loop

1. The player walks around the office using keyboard movement.
2. The player approaches an agent.
3. The player presses `E`.
4. An in-world dialog opens with current context and available actions.
5. The player performs an action or inspects details.

### Agent Interaction

Pressing `E` near an agent opens a native in-world dialog with:

- agent name
- title or role
- current status
- current task or ticket title
- latest snippet or summary
- actions such as:
  - `Chat`
  - `Pause/Resume`
  - `Fire`
  - `Open Ticket`
  - `Open In Tracker`

`Chat` should post feedback to the relevant Paperclip issue comment thread.

The dialog should be native to the game UI, not a full tracker rebuild.

### Hiring Flow

Hiring should be accessible from anywhere in the office through an in-game popup, since the CEO can request a hire at any time.

Flow:

1. Open hire popup.
2. Enter minimal hire fields.
3. Create a Paperclip hire request.
4. Approve it in-world.
5. On success, spawn the new agent at a fixed spawn point in the office.

This preserves Paperclip's approval model without forcing users into the normal UI.

### Firing Flow

Firing uses the Paperclip terminate action.

Flow:

1. Interact with an agent.
2. Choose `Fire`.
3. Confirm the action.
4. Play a short firing animation.
5. Remove the agent from the world after the backend confirms termination or after the next sync.

### Tracker Escape Hatch

Add a persistent `View in Tracker` button in the top-right of the game UI.

This opens the standard Paperclip UI in a new tab for:

- advanced settings
- deep issue management
- workflows not exposed in the world

Agent dialogs should also support `Open In Tracker` for the current record.

## UI/UX Direction

### Visual Style

The office should feel intentional, readable, and game-like rather than dashboard-like.

Principles:

- prioritize state legibility over realism
- keep the scene compact and easy to scan
- use strong visual anchors: desks, computers, water cooler, couch/bean bag, shared speech bubbles
- make the office readable at a glance in screenshots and demos

### Embedded Detail UI

For v1, the interaction box should be lightweight and native:

- render minimal high-value information directly
- keep actions obvious and fast
- avoid rebuilding deep Paperclip pages inside the world

If embedding tracker detail in an iframe is simple and same-origin, it can be considered later, but it is not required for the first usable version.

## V1 Scope

Build:

- one office scene
- one boss avatar
- keyboard movement and collisions
- Paperclip-backed agent rendering
- a simple world-state mapper
- in-world dialogs for agent interaction
- hire popup with approval flow
- fire action
- chat/feedback via Paperclip comments
- `View in Tracker` escape hatch

Defer:

- music pass
- speech understanding and speech output
- token-usage health bars
- pushed live updates

## Components

### Paperclip Client Layer

Responsibilities:

- fetch agents
- fetch issues and comments as needed
- fetch approvals
- fetch dashboard summary
- fetch recent activity
- perform mutations such as hire, approve, comment, pause/resume, and terminate

### World State Mapper

Responsibilities:

- convert Paperclip entities to simplified world states
- determine target positions and transitions
- infer symbolic `talking` moments from recent collaboration signals

### Office Scene

Responsibilities:

- tilemap
- collision map
- spawn points
- desk, water-cooler, and couch areas

### Agent Actor System

Responsibilities:

- sprite selection
- movement and pathing
- animation transitions
- speech-bubble placement
- termination animation handling

### Player Controller

Responsibilities:

- keyboard movement
- collision handling
- proximity detection
- interaction triggering

### Dialog And HUD Layer

Responsibilities:

- pixel-style popups
- interaction dialogs
- hire popup
- top-right `View in Tracker` button

### Documentation

Responsibilities:

- document setup
- document borrowed assets and inspiration
- capture license and attribution requirements

## Risks And Mitigations

### Backend State Changes Faster Than Movement

Risk:
Paperclip updates can happen faster than character movement.

Mitigation:
Use the visual intent layer. Treat character motion as a readable projection, not an exact replay of backend timing.

### Symbolic Talking Inference Is Noisy

Risk:
Comments and approvals are only a rough proxy for real conversations.

Mitigation:
Keep the `talking` state short-lived and decorative. Do not make it authoritative.

### Asset Work Expands Unnecessarily

Risk:
Office polish can become a time sink.

Mitigation:
Ship a minimal office first. Add polish only after the loop works.

### Too Much Tracker UI Rebuilt In-World

Risk:
Rebuilding deep ticket management inside the game slows delivery.

Mitigation:
Keep native UI shallow and use `Open In Tracker` plus `View in Tracker` for deeper workflows.

### Realtime Temptation

Risk:
Live updates may pull the project into undocumented or unstable integrations.

Mitigation:
Use REST plus polling first. Revisit pushed updates later if the demo needs it.

## Future Enhancements

- music and ambient audio
- speech input and speech output
- health bars or similar visual indicators derived from token usage
- pushed live updates instead of polling

## Source References

- Paperclip docs: architecture, agents API, issues API, approvals API, dashboard API, activity API
- `paperclipai/paperclip`
- `geezerrrr/agent-town`
- `pablodelucca/pixel-agents`
- WorkAdventure documentation
- `a16z-infra/ai-town`
