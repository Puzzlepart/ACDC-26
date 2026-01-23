# CCCP Minecraft bots

## Remote control bot (Prismarine viewer + WS control)

Run the bot:

```bash
node mc-bots/remote_control_bot.js
```

Environment variables:

- `MC_HOST` (default: `mc.craycon.no`)
- `MC_PORT` (default: `25565`)
- `MC_USERNAME` (default: `comrade_remote`)
- `MC_BOTS` (comma-separated bot usernames; default: `MC_USERNAME`)
- `VIEWER_PORT` (default: `3000`)
- `VIEWER_HOST` (optional; overrides iframe host)
- `CONTROL_PORT` (default: `4000`)
- `BOT_AUTH_TOKEN` (optional; required for non-local clients)
- `LOOK_SENSITIVITY` (default: `0.0025`)
- `AUTO_JUMP` (default: `true`)
- `CONTROL_UI_PATH` (optional override for UI HTML)

Job config:

- `DEFAULT_JOB` (e.g. `farmer`, `guard`, `scout`)
- `AUTO_ASSIGN_JOBS` (default: `true`)
- `BOT_JOBS` (bot assignments, e.g. `farmer_bot=farmer,guard_bot=guard`)
- `FARMER_CROP` (default: `wheat`)
- `FARMER_RADIUS` (default: `6`)
- `FARMER_IDLE_MS` (default: `800`)
- `GUARD_RADIUS` (default: `8`)
- `GUARD_HOSTILE_RANGE` (default: `6`)
- `GUARD_TARGET` (optional player name to follow)
- `GUARD_STEP_MS` (default: `250`)
- `GUARD_IDLE_MS` (default: `300`)
- `GUARD_ALLOW_JUMP` (default: `false`)
- `SCOUT_RADIUS` (default: `12`)
- `SCOUT_STEP_MS` (default: `250`)
- `SCOUT_IDLE_MS` (default: `1200`)
- `SCOUT_ALLOW_JUMP` (default: `false`)

Mindcraft integration:

- `MINDCRAFT_ENABLED` (default: `true`)
- `MINDCRAFT_HOST` (default: `localhost`)
- `MINDCRAFT_PORT` (default: `8080`)
- `MINDCRAFT_PROFILES_DIR` (default: `mindcraft/profiles`)

Open the control UI:

- `http://localhost:4000`

This page embeds the Prismarine Viewer and exposes commands (move, follow, stop, jobs, viewer controls, Mindcraft LLM setup).
