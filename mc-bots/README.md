# CCCP Minecraft bots

## Remote control bot (Prismarine viewer + WS control)

Run the bot:

```bash
node mc-bots/remote_control_bot.js
```

Environment variables:

- `MC_HOST` (default: `localhost`)
- `MC_PORT` (default: `55916`)
- `MC_USERNAME` (default: `comrade_remote`)
- `VIEWER_PORT` (default: `3000`)
- `CONTROL_PORT` (default: `4000`)
- `BOT_AUTH_TOKEN` (optional; required for non-local clients)

Open the control UI:

- `http://localhost:4000`

This page embeds the Prismarine Viewer and exposes basic commands (move, follow, stop).
