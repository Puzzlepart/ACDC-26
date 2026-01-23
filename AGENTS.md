# AGENTS.md (Monorepo Guide)

This file is the **single source of truth** for how autonomous agents (and humans) should work in this monorepo:

- where things live
- how to build/test/run
- coding + PR conventions
- safety + secrets rules

If a local package has extra rules, it should include its own `AGENTS.md` and **may override** parts of this one.

---

## 1) Project Overview

**Project:** CrayCon Creepers (CCC) - Team Website & Minecraft AI Bots  
**Competition:** Arctic Cloud Developer Challenge 2026 (ACDC26)  
**Team:** CrayCon Creepers = Crayon Consulting at ACDC  
**Domains:** [creepers.craycon.no](https://creepers.craycon.no) | [ccc.d0.si](https://ccc.d0.si)

**What we're building:**
- Team website (React + Vite + Tailwind, deployed on Cloudflare Workers)
- AI-powered Minecraft bots (Mindcraft + Mineflayer integration)
- Blog posts documenting badge claims (published to [acdc.blog/crayon26/](https://acdc.blog/crayon26/))
- Skills for badge planning and execution (acdc-badge-sniper)

**Agent priorities:**

1. Don't break `main`.
2. Prefer smallest change that achieves the goal.
3. Keep things demo-friendly (fast setup, deterministic flows, good UX).
4. Badge-first thinking: every PR should map to a badge or judge category when possible.

---

## 2) Brand Identity

### Team Name Layers
- **CrayCon Creepers** = CCC
- **CrayCon** = Crayon Consulting shorthand + hacker con vibes
- **Creepers** = Minecraft's iconic explosive mob

### Design Aesthetic
Fusion of:
- **Minecraft**: Blocky, pixelated, 8-bit/16-bit retro gaming
- **Hacker/Cyberpunk**: Terminal green, Matrix vibes, retro computing
- **Modern web**: Clean, responsive, professional but playful

### Color Palette
- **Primary**: Creeper green (#7CB342, #558B2F, #4CAF50)
- **Accent**: Diamond blue (#4DD0E1, #00BCD4)
- **Base**: Black (#000000, #1a1a1a), dark gray (#212121)
- **Highlights**: Neon green (#39FF14), gold/yellow for accents (#FFD700)
- **Text**: White (#FFFFFF), light green (#C8E6C9)

### Typography
- Headers: Monospace/pixel fonts (Minecraft-style) or bold tech fonts
- Body: Clean, readable sans-serif (Inter, Space Grotesk, or system fonts)
- Code/terminal elements: Monospace (Fira Code, JetBrains Mono)

### Tone & Voice
- Professional but playful
- Geeky references encouraged (Minecraft, hacking culture, gaming)
- Not corporate-stiff - this is a fun competition team
- Tech-savvy audience
- "Thieving Bastards" spirit: use what exists, steal relentlessly, focus on the business problem

---

## 3) Competition Context: ACDC Badges & Categories

**Arctic Cloud Developer Challenge 2026** has two scoring tracks:

### 3.1 Badges (point-based)
- Individual achievements worth 1-10 points each
- Examples: "Thieving Bastards", "Power to the People", "Dataverse Diving"
- Track claimed badges at [acdc.blog/crayon26/](https://acdc.blog/crayon26/)
- Full badge list: [arcticclouddeveloperchallenge.net/badges-categories](https://www.arcticclouddeveloperchallenge.net/badges-categories)

### 3.2 Judge Categories (qualitative awards)
- Business Value
- Governance & Security
- Low-Code Solutions
- Data & Analytics
- Technical Depth
- AI & Agents

### 3.3 Badge-First Development Workflow

**Before starting any feature:**
1. Run `acdc-badge-sniper` skill to identify high-ROI targets
2. Map planned work to badges/categories
3. Document evidence requirements up front

**When completing work:**
1. Collect evidence (screenshots, demo steps, code snippets)
2. Write blog post in `blog/<badge-name>.md` (see [blog/README.md](blog/README.md))
3. Publish to [acdc.blog/crayon26/](https://acdc.blog/crayon26/)
4. Update `skills/acdc-badge-sniper/data/badges_acquired.json`

**Badge data sync:**
Base URL (use exactly): `https://stacdc2026.blob.core.windows.net/acdc/`

The `acdc-badge-sniper` skill automatically fetches:
- `{BASE_URL}metadata.json`
- `{BASE_URL}claims.json`
- `{BASE_URL}teams.json`
- `{BASE_URL}rankings.json`

See [skills/acdc-badge-sniper/SKILL.md](skills/acdc-badge-sniper/SKILL.md) for detailed usage.

---

## 4) Repo Map

```
/
├── README.md                    # High-level overview, team roster, project links
├── AGENTS.md                    # This file - monorepo agent context
├── LICENSE                      # WTFPL
├── package.json                 # Root workspace config (npm workspaces)
│
├── assets/                      # Static assets (logo, images, brand materials)
│   └── ccc_logo.png
│
├── web/                         # Team website (creepers.craycon.no / ccc.d0.si)
│   ├── AGENTS.md                # Web-specific agent context (brand, design, deployment)
│   ├── README.md                # Web project docs
│   ├── package.json             # React + Vite + Tailwind stack
│   ├── wrangler.toml            # Cloudflare Worker deployment config
│   ├── src/                     # React components, pages
│   └── public/                  # Static assets (avatars, fonts)
│
├── mindcraft/                   # AI Minecraft bots (Mindcraft fork)
│   ├── README.md                # Mindcraft docs (upstream project)
│   ├── FAQ.md                   # Troubleshooting guide
│   ├── package.json             # Mineflayer + 17 AI providers
│   ├── main.js                  # Bot entry point
│   ├── keys.json                # API keys (gitignored, see keys.example.json)
│   ├── settings.js              # Bot connection settings
│   ├── profiles/                # Bot personality configs (andy.json, claude.json, etc.)
│   ├── src/                     # Bot agent logic
│   └── patches/                 # Node module patches (patch-package)
│
├── mc-bots/                     # Custom bot scripts (spawn_comrade.js, digger_bot.js, etc.)
│   └── README.md                # Bot usage docs
│
├── blog/                        # Badge claim blog posts
│   ├── README.md                # Blog post guidelines
│   └── <badge-name>.md          # Individual posts (publish to acdc.blog/crayon26/)
│
├── skills/                      # Claude Code skills
│   └── acdc-badge-sniper/       # Badge planning & ranking skill
│       ├── SKILL.md             # Skill definition
│       ├── config.yml           # Scoring weights
│       └── data/                # Team profile, badge cache, acquired badges
│
└── misc/                        # Utility scripts (server checks, etc.)
```

**Key locations for common tasks:**
- UI/web work → [web/](web/) (see [web/AGENTS.md](web/AGENTS.md) for details)
- Minecraft bot work → [mindcraft/](mindcraft/) or [mc-bots/](mc-bots/)
- Blog posts → [blog/](blog/)
- Badge planning → [skills/acdc-badge-sniper/](skills/acdc-badge-sniper/)
- Brand assets → [assets/](assets/)

---

## 5) How to Work (Rules for Agents)

### 5.1 Always do this before changes

- Read relevant package `README.md` and any local `AGENTS.md`.
- Search the repo for existing patterns before inventing new ones.
- Keep changes scoped: one goal per PR unless explicitly asked.
- **Check if work maps to a badge/category (run `acdc-badge-sniper` if unsure).**

### 5.2 Make changes in this order

1. Types/contracts (shared)
2. Implementation
3. Tests
4. Docs
5. Cleanup (lint/format)

### 5.3 Communication standard (in PRs / summaries)

Include:

- What changed (1–3 bullets)
- How to run/test locally
- Any config needed (env vars, secrets, Azure resources)
- Risks / follow-ups

---

## 6) Build / Run / Test

### 6.1 Requirements

**System:**
- Node: `>= 22.0.0` (per root package.json)
- npm: `>= 10.0.0`
- Minecraft Java Edition (v1.21.1 recommended, up to v1.21.6)

**API Keys (at least one for Minecraft bots):**
- OpenAI, Claude (Anthropic), Gemini (Google), or see [mindcraft/README.md](mindcraft/README.md) for 17 providers
- Store in `mindcraft/keys.json` (see [mindcraft/keys.example.json](mindcraft/keys.example.json))

### 6.2 Quick Start

From repo root:

```bash
# Install all dependencies (root + workspaces)
npm install

# Start website dev server
npm run dev  # or: cd web && npm run dev

# Start Minecraft bot
cd mindcraft
node main.js  # or: npm start
```

### 6.3 Common Commands

**Root level (runs on all workspaces):**
- `npm run build` - build all projects
- `npm run dev` - run dev servers for all workspaces
- `npm run test` - run tests (if present)
- `npm run clean` - remove all node_modules

**Web project ([web/](web/)):**
- `npm run dev` - Vite dev server (http://localhost:5173)
- `npm run build` - TypeScript compile + production build
- `npm run preview` - preview production build locally
- `npm run lint` - ESLint check
- `npx wrangler deploy` - deploy to Cloudflare Workers
- See [web/AGENTS.md](web/AGENTS.md) for detailed web development guidelines

**Mindcraft ([mindcraft/](mindcraft/)):**
- `node main.js` - start bot with default profile (andy.json)
- `node main.js --profiles ./profiles/claude.json` - start bot with custom profile
- `npm run postinstall` - apply node module patches (patch-package)
- `python tasks/run_task_file.py --task_path=tasks/example_tasks.json` - run bot tasks

**Custom bots ([mc-bots/](mc-bots/)):**
- `node spawn_comrade.js` - spawn a basic bot
- `node digger_bot.js` - run mining bot
- See [mc-bots/README.md](mc-bots/README.md) for specific bot scripts

### 6.4 Minecraft Server Setup

**For local testing:**
1. Start a Minecraft world (Java Edition)
2. Open to LAN on port `55916`
3. Configure [mindcraft/settings.js](mindcraft/settings.js):
   ```javascript
   "host": "localhost",
   "port": 55916,
   "auth": "offline",
   ```

**For online servers:**
- Change `auth: "microsoft"` in settings.js
- Bot profile name must match Minecraft account name exactly
- See [mindcraft/README.md](mindcraft/README.md) for account switching workflow

### 6.5 Docker (Optional)

For `allow_insecure_coding` security:

```bash
# Run bot in container
docker run -i -t --rm -v $(pwd):/app -w /app -p 3000-3003:3000-3003 node:latest node main.js

# Or use docker-compose
cd mindcraft
docker-compose up
```

**Note:** Use `host.docker.internal` instead of `localhost` in settings.js when running in Docker.

---

## 7) Coding Conventions

### 7.1 TypeScript / JavaScript

- Prefer TypeScript for all new code (especially in [web/](web/)).
- No `any` unless unavoidable; justify with a short comment.
- Keep modules small; avoid "god files".
- **For Minecraft bot code:** JavaScript is fine (Mindcraft is JS-native), but add JSDoc types where complex.

### 7.2 API design

- Validate inputs at boundaries (agent tool calls, bot commands).
- Return useful errors for demo/debug (but don’t leak secrets).

### 7.3 Logging

- Use structured logs.
- Never log tokens, secrets, or raw PII.

### 7.4 Feature flags / demo mode

- Prefer config-driven toggles (env vars) for demo shortcuts.
- Keep “hackathon hacks” explicit and isolated.

---

## 8) Minecraft Bots: Mindcraft & Custom Scripts

### 8.1 Mindcraft Overview

Fork of [mindcraft](https://github.com/mindcraft-bots/mindcraft) - AI agents for Minecraft using LLMs + Mineflayer.

**Key features:**
- 17 AI provider integrations (OpenAI, Claude, Gemini, Groq, DeepSeek, etc.)
- Pathfinding, combat, inventory management via PrismarineJS
- Bot personality profiles (JSON configs with custom prompts)
- Task execution system (construction, crafting, cooking)
- 3D viewer (Prismarine Viewer) for debugging

**Main entry point:** [mindcraft/main.js](mindcraft/main.js)

### 8.2 Bot Profiles

Profiles define bot personality, LLM backend, and prompts:
- [profiles/andy.json](mindcraft/profiles/andy.json) - default bot
- [profiles/claude.json](mindcraft/profiles/claude.json) - Claude-powered
- [profiles/deepseek.json](mindcraft/profiles/deepseek.json) - DeepSeek reasoning model
- [profiles/gpt.json](mindcraft/profiles/gpt.json) - GPT-4 bot
- See [mindcraft/README.md](mindcraft/README.md) for full list

**To create a new bot:**
1. Copy existing profile JSON
2. Customize `name`, `model`, prompts
3. Run: `node main.js --profiles ./profiles/your-bot.json`

### 8.3 Custom Bot Scripts

Located in [mc-bots/](mc-bots/):
- `spawn_comrade.js` - spawn basic bot
- `digger_bot.js` - mining automation
- `comrade_farmer.js` - farming automation
- `walk_bot.js` - pathfinding test
- `view_bot.js` - viewer test

These are simpler, single-purpose scripts for specific tasks.

### 8.4 Agent Guidelines for Bot Work

**When modifying bot behavior:**
- Prompts live in profile JSON files ([mindcraft/profiles/*.json](mindcraft/profiles/))
- Examples live in `src/agent/library/` (skills, examples)
- Action implementations live in `src/agent/` (commands, skills, memory)

**When adding new capabilities:**
- Prefer extending existing actions over creating new ones
- Add examples to help the bot learn (few-shot prompting)
- Test in creative mode first, then survival

**Patching dependencies:**
- Use `patch-package` for node module fixes
- Patches live in [mindcraft/patches/](mindcraft/patches/) directory
- Run `npm run postinstall` to apply patches after install

### 8.5 Debugging Bots

- Enable viewer in [settings.js](mindcraft/settings.js) for visual debugging
- Check `mindcraft/logs/` for bot output
- Use `--verbose` flag for detailed logging
- See [mindcraft/FAQ.md](mindcraft/FAQ.md) for common issues
- Join the [Mindcraft Discord](https://discord.gg/mp73p35dzC) for upstream support

### 8.6 Prompting Rules

- Keep system prompts minimal and versioned in repo (profile JSON files)
- Store prompts as files (not scattered in code)
- Prefer templates with variables

### 8.7 Safety Defaults

- "Read-only" by default when uncertain
- Require explicit user intent for destructive actions (delete/reset)
- Log bot actions that affect game state:
  - input parameters
  - decision rationale (brief)
  - resulting action
  - correlation id / run id

---

---

## 9) Badge & Blog Workflow

### 9.1 Using the Badge Sniper Skill

**Before starting new work:**

1. Run the `acdc-badge-sniper` skill (Claude Code skill)
2. Provide current team state:
   - Stack: (React, Minecraft bots, AI agents, etc.)
   - Built now: (list features)
   - Time left: (e.g., "2 hours", "rest of today")
   - Constraints: (no admin, no server changes, etc.)
3. Skill will output:
   - Top 5 badge targets (ranked by ROI)
   - Top 1-2 judge categories
   - Step-by-step checklist
   - Evidence requirements
   - 60-minute action plan

**Badge data files:**
- [skills/acdc-badge-sniper/data/team_profile.json](skills/acdc-badge-sniper/data/team_profile.json) - team metadata
- [skills/acdc-badge-sniper/data/badges_acquired.json](skills/acdc-badge-sniper/data/badges_acquired.json) - claimed badges
- [skills/acdc-badge-sniper/data/](skills/acdc-badge-sniper/data/) - cached badge definitions from ACDC API

Skill auto-syncs badge data from base URL `https://stacdc2026.blob.core.windows.net/acdc/`:
- `metadata.json`
- `claims.json`
- `teams.json`
- `rankings.json`

### 9.2 Writing Blog Posts

**When claiming a badge:**

1. Create file: `blog/<badge-name>.md`
2. Use structure from existing posts (see [blog/thieving_bastards.md](blog/thieving_bastards.md))
3. Include:
   - TL;DR paragraph
   - Why this badge applies (evidence)
   - Technical details (code snippets, screenshots, links)
   - Badge hashtag: `#BadgeName`
   - Published URL from acdc.blog
4. Publish to [acdc.blog/crayon26/](https://acdc.blog/crayon26/)
5. Store by badge name (not date)

See [blog/README.md](blog/README.md) for detailed blog post guidelines.

**Blog post tone:**
- "Thieving Bastards" spirit (see example post)
- Technical but accessible
- Show, don't just tell (include evidence)
- Link to repo/code when relevant

### 9.3 Badge Claim Checklist

- [ ] Badge mapped to work (via badge-sniper or manual)
- [ ] Evidence collected (demo steps, screenshots, code)
- [ ] Blog post written and published
- [ ] URL added to blog post markdown
- [ ] `badges_acquired.json` updated (if tracking locally)
- [ ] PR linked to badge (in description)

---

## 10) Environment Variables & Secrets

### 10.1 Local env

- For Minecraft bots: Use [mindcraft/keys.example.json](mindcraft/keys.example.json) as template
  - Copy to `mindcraft/keys.json` (gitignored)
  - Add API keys for at least one LLM provider (OpenAI, Claude, Gemini, etc.)
- For other services: Real secrets live in:
  - local `.env` (gitignored), or
  - secret store (Key Vault), or
  - CI secrets

### 10.2 Hard rules

- NEVER commit:
  - API keys (OpenAI, Claude, Gemini, etc.) in [mindcraft/keys.json](mindcraft/keys.json)
  - tokens, client secrets, certificates, connection strings
  - personal access tokens
- If leaked:
  - rotate immediately
  - purge history if needed

---

## 11) Tests & Quality Gates

Minimum bar for merging:

- `npm run lint` passes (for [web/](web/) project)
- `npm test` passes (or scoped equivalent)
- No new TypeScript errors
- No obvious security footguns (secrets, injection, open proxies)
- No API keys in diffs (check [mindcraft/keys.json](mindcraft/keys.json))

Testing priorities (hackathon mode):

1. Smoke tests for main user flows
2. Bot testing in creative mode before survival
3. Minimal unit tests for tricky logic

---

## 12) Git / PR Conventions

### 12.1 Branch naming

- `feat/<thing>`
- `fix/<thing>`
- `chore/<thing>`

### 12.2 Commit messages

- Conventional-ish recommended:
  - `feat: ...`
  - `fix: ...`
  - `chore: ...`
  - `docs: ...`

### 12.3 PR checklist

- [ ] Linked to a goal/badge/judge category (use badge-sniper to identify)
- [ ] Demo steps included (for UI/bot changes)
- [ ] Screenshots/GIF for UI changes (if applicable)
- [ ] No secrets in diff (check [keys.json](mindcraft/keys.json), .env files)
- [ ] Docs updated (if it changes how to run/use)
- [ ] Blog post drafted (if claiming a badge)

---

## 13) "Don't Surprise the Team" Rules

- Don’t introduce new frameworks/services without a clear reason.
- Don’t refactor unrelated code “because it’s nicer”.
- If you must do a bigger change:
  - do it in small steps
  - keep the demo working after each step

---

## 14) Quick Start for New Contributors

**First time setup:**

```bash
# 1. Clone repo
git clone https://github.com/Puzzlepart/ACDC-26.git
cd ACDC-26

# 2. Install dependencies
npm install

# 3. Start website (if working on web)
cd web
npm run dev
# Visit http://localhost:5173

# 4. OR start Minecraft bot (if working on bots)
cd mindcraft
cp keys.example.json keys.json
# Add at least one API key to keys.json
node main.js
```

**For Minecraft bot development:**
1. Start a Minecraft world (Java Edition v1.21.1)
2. Open to LAN on port 55916
3. Run `node main.js` in [mindcraft/](mindcraft/)
4. Bot should connect and appear in-game

**For badge planning:**
1. Ask Claude to use `acdc-badge-sniper` skill
2. Provide team stack and time constraints
3. Follow recommended action plan

**Stuck?**
- Check [web/README.md](web/README.md) for web project details
- Check [web/AGENTS.md](web/AGENTS.md) for web development guidelines
- Check [mindcraft/README.md](mindcraft/README.md) for bot setup
- Check [mindcraft/FAQ.md](mindcraft/FAQ.md) for common bot issues
- Join [Mindcraft Discord](https://discord.gg/mp73p35dzC) for upstream bot support

---

## 15) Contact / Ownership

**Team:** CrayCon Creepers (CCC)  
**Company:** Crayon Consulting  
**Competition:** Arctic Cloud Developer Challenge 2026

**Team Members:**
- [damsleth](https://github.com/damsleth) - Carl Joakim Damsleth
- [siifux](https://github.com/siifux) - Sindre Furulund
- [jenunn](https://github.com/jenunn) - Øistein Unnerud

**Links:**
- Website: [creepers.craycon.no](https://creepers.craycon.no) | [ccc.d0.si](https://ccc.d0.si)
- Blog: [acdc.blog/crayon26/](https://acdc.blog/crayon26/)
- Repo: [github.com/Puzzlepart/ACDC-26](https://github.com/Puzzlepart/ACDC-26)

**If unsure where to implement something:**
- UI/web work → [web/](web/) (see [web/AGENTS.md](web/AGENTS.md) for details)
- Bot behavior → [mindcraft/](mindcraft/) (profiles, prompts, agent logic)
- Custom bot scripts → [mc-bots/](mc-bots/)
- Blog posts → [blog/](blog/)
- Badge planning → use `acdc-badge-sniper` skill
- Brand assets → [assets/](assets/)
