# Strategy: Remote-Controlled Minecraft Bots via Prismarine

## Goal
Build reliable, demo-friendly Minecraft bots that can be controlled remotely, with live world visualization. Use existing Mineflayer/Prismarine tooling already present in this repo.

## Scope
- Control plane: remote commands to bots (move, mine, craft, follow, stop).
- Telemetry: bot state + logs + viewer stream.
- Safety: bounded commands, rate limits, and kill switch.
- Minimal UX: a web or CLI control surface.

## Repo Starting Points
- Mineflayer bots already exist in `mc-bots/` (e.g., `view_bot.js`).
- Prismarine Viewer is already in use (`prismarine-viewer`), and Mindcraft has a browser viewer with per-agent ports.
- Mindcraft provides agent orchestration and profiles; use it when you want LLM-driven behavior.

## Architecture (MVP)

### 1) Bot Runtime
- Base runtime: Mineflayer bot process (single bot or multi-bot).
- Add Prismarine Viewer on spawn for live world view.
- Expose a control API (WebSocket or HTTP) for remote commands.

### 2) Control Server
- A small Node service that:
  - Accepts remote commands (auth required).
  - Validates inputs and translates to Mineflayer actions.
  - Broadcasts bot telemetry (position, health, inventory, status).

### 3) Remote UI
- Minimal control UI (web page or CLI).
- Shows:
  - Viewer iframe (Prismarine Viewer).
  - Bot status panel.
  - Command input and quick action buttons.

### 4) Data Flow
- Remote UI -> Control Server -> Bot Runtime -> Mineflayer.
- Bot Runtime -> Control Server -> UI telemetry.
- Prismarine Viewer stream served from bot runtime on a dedicated port (e.g., 3000+N).

## Command Protocol (Proposed)

### Command Envelope
- `type`: string (e.g., `move`, `mine`, `craft`, `follow`, `stop`).
- `id`: client-generated command id for acknowledgements.
- `args`: object per command.

### Minimum Commands
- `move`: { x, y, z }
- `follow`: { playerName, distance }
- `mine`: { blockName, count }
- `craft`: { itemName, count }
- `stop`: {}
- `status`: {}

### Responses
- `ack`: command accepted + queued.
- `done`: command completed.
- `error`: invalid or failed.

## Safety & Reliability
- **Read-only default**: no destructive commands unless explicit and authenticated.
- **Kill switch**: immediate `stop` and disconnect.
- **Rate limits**: per-client and per-bot.
- **Sandboxing**: avoid dynamic code execution for remote inputs.

## Implementation Plan

### Phase 1: Viewer + Manual Remote Commands (MVP)
1. Create a `mc-bots/remote_control_bot.js` based on `view_bot.js`.
2. Add a small WebSocket server inside the bot process.
3. Implement `move`, `follow`, `stop`.
4. Stream telemetry to clients (position/health/food).
5. Ship a barebones HTML UI that connects and sends commands.

### Phase 2: Bot Task Layer
1. Add task wrappers for `mine` and `craft`.
2. Add a simple command queue (serial execution).
3. Provide status: `idle`, `busy`, `error`.

### Phase 3: Multi-Bot Orchestration
1. One control server, multiple bot processes.
2. Viewer ports: `3000 + index`.
3. UI can select bot and fan out commands.

### Phase 4: Optional LLM Brain (Mindcraft)
1. Attach Mindcraft agents to bots for higher-level decisions.
2. Remote commands become high-level intents (e.g., “build a hut”).
3. Keep a safe-mode toggle.

## Deployment & Networking
- Local LAN: `host=localhost`, `port=55916` in `settings.js`.
- Remote: use a dedicated server; require Microsoft auth.
- If running in Docker, use `host.docker.internal` for local server.

## Demo Checklist
- Bot connects and spawns.
- Prismarine viewer loads in browser.
- Remote UI can move/follow/stop.
- Telemetry updates live.

## Risks / Open Questions
- Remote auth + security (choose a simple token-based auth for MVP).
- Server connection stability (auto-reconnect logic).
- Task reliability in survival mode (test in creative first).

## Evidence for Badges
- Show viewer + remote control in action.
- Log of commands and responses.
- Architecture diagram or flow screenshot.

