# AGENTS.md (Monorepo Guide)

This file is the **single source of truth** for how autonomous agents (and humans) should work in this monorepo:

- where things live
- how to build/test/run
- coding + PR conventions
- safety + secrets rules

If a local package has extra rules, it should include its own `AGENTS.md` and **may override** parts of this one.

---

## 1) Mission + Scope

**Project:** CCCP (CrayCon Creepers Production)
**Goal:** Ship a hackathon-ready product that demonstrates:

- AI/agent workflows
- Microsoft ecosystem integration (Graph/M365/etc.)
- dashboards/insights and a coherent business case
- secure-ish, reproducible setup

**Agent priorities:**

1. Don’t break `main`.
2. Prefer smallest change that achieves the goal.
3. Keep things demo-friendly (fast setup, deterministic flows, good UX).

---

## 2) Repo Map

> Update this section to reflect your actual structure.

- `/apps/`
  - `web/` – main frontend (SPA / Next.js / whatever)
  - `api/` – backend API (Node / .NET / Azure Functions)
  - `dashboards/` – reporting UI (if separate)
- `/packages/`
  - `shared/` – shared utils/types
  - `agents/` – agent runtime + prompts/tools
  - `minecraft/` – minecraft integration layer (if applicable)
- `/infra/`
  - `bicep/` or `terraform/` – IaC
  - `pipelines/` – CI/CD
- `/docs/` – architecture notes, diagrams, decisions
- `/.github/` – workflows, templates

---

## 3) How to Work (Rules for Agents)

### 3.1 Always do this before changes

- Read relevant package `README.md` and any local `AGENTS.md`.
- Search the repo for existing patterns before inventing new ones.
- Keep changes scoped: one goal per PR unless explicitly asked.

### 3.2 Make changes in this order

1. Types/contracts (shared)
2. Implementation
3. Tests
4. Docs
5. Cleanup (lint/format)

### 3.3 Communication standard (in PRs / summaries)

Include:

- What changed (1–3 bullets)
- How to run/test locally
- Any config needed (env vars, secrets, Azure resources)
- Risks / follow-ups

---

## 4) Build / Run / Test (Monorepo)

> Replace commands with your tooling (pnpm/yarn/npm/nx/turborepo/etc.)

### 4.1 Requirements

- Node: `>= 20`
- Package manager: `pnpm` (preferred) / `yarn` / `npm`
- Optional: Azure CLI, Power Platform CLI, etc.

### 4.2 Common Commands

From repo root:

- Install:
  - `pnpm i`

- Dev:
  - `pnpm dev`

- Build all:
  - `pnpm build`

- Test all:
  - `pnpm test`

- Lint/format:
  - `pnpm lint`
  - `pnpm format`

### 4.3 Targeted package commands

- `pnpm --filter <package> dev`
- `pnpm --filter <package> test`
- `pnpm --filter <package> build`

---

## 5) Coding Conventions

### 5.1 TypeScript / JavaScript

- Prefer TypeScript for all new code.
- No `any` unless unavoidable; justify with a short comment.
- Keep modules small; avoid “god files”.

### 5.2 API design

- Define contracts in `packages/shared` (types + schemas).
- Validate inputs at boundaries (API endpoints, agent tool calls).
- Return useful errors for demo/debug (but don’t leak secrets).

### 5.3 Logging

- Use structured logs.
- Never log tokens, secrets, or raw PII.

### 5.4 Feature flags / demo mode

- Prefer config-driven toggles (env vars) for demo shortcuts.
- Keep “hackathon hacks” explicit and isolated.

---

## 6) Agents: Runtime + Prompting Rules

### 6.1 Tooling boundary

Agents may:

- call internal tools/functions exposed by `packages/agents`
- read from telemetry/data stores that are already configured
  Agents must not:
- hardcode secrets
- call external services without config + retries + timeouts
- modify prod resources unintentionally

### 6.2 Prompts

- Keep system prompts minimal and versioned in repo.
- Store prompts as files (not scattered in code).
- Prefer templates with variables.

### 6.3 Determinism

- If an agent action affects game state / production state, log:
  - input parameters
  - decision rationale (brief)
  - resulting action
  - correlation id / run id

### 6.4 Safety defaults

- “Read-only” by default when uncertain.
- Require explicit user intent for destructive actions (delete/reset).
- Add guardrails in tool schemas (min/max, enums, validation).

---

## 7) Environment Variables & Secrets

### 7.1 Local env

- Use `.env.example` as the canonical template.
- Real secrets live in:
  - local `.env` (gitignored), or
  - secret store (Key Vault), or
  - CI secrets

### 7.2 Hard rules

- NEVER commit:
  - tokens, client secrets, certificates, connection strings
  - personal access tokens
- If leaked:
  - rotate immediately
  - purge history if needed

---

## 8) Tests & Quality Gates

Minimum bar for merging:

- `pnpm lint` passes
- `pnpm test` passes (or scoped equivalent)
- No new TypeScript errors
- No obvious security footguns (secrets, injection, open proxies)

Testing priorities (hackathon mode):

1. Contract tests for API boundaries
2. Smoke tests for main user flows
3. Minimal unit tests for tricky logic

---

## 9) Git / PR Conventions

### 9.1 Branch naming

- `feat/<thing>`
- `fix/<thing>`
- `chore/<thing>`

### 9.2 Commit messages

- Conventional-ish recommended:
  - `feat: ...`
  - `fix: ...`
  - `chore: ...`
  - `docs: ...`

### 9.3 PR checklist

- [ ] Linked to a goal/badge/judge category (if relevant)
- [ ] Demo steps included
- [ ] Screenshots/GIF for UI changes (if applicable)
- [ ] No secrets in diff
- [ ] Docs updated (if it changes how to run/use)

---

## 10) Architecture Notes (Where to Document)

- Decisions go in `/docs/adr/` (short ADRs).
- Diagrams go in `/docs/diagrams/`.
- Each app/package should maintain a focused README.

---

## 11) “Don’t Surprise the Team” Rules

- Don’t introduce new frameworks/services without a clear reason.
- Don’t refactor unrelated code “because it’s nicer”.
- If you must do a bigger change:
  - do it in small steps
  - keep the demo working after each step

---

## 12) Quick Pointers for New Contributors

1. `pnpm i`
2. Copy `.env.example` → `.env` and fill required values
3. `pnpm dev`
4. Open `apps/web` (or your main app)
5. Run smoke flow described in `/docs/demo.md` (if present)

---

## 13) Contact / Ownership

- Owners: CCC (CrayCon Creepers)
- If unsure where to implement something:
  - start in `packages/shared` for contracts
  - start in `apps/api` for endpoints
  - start in `apps/web` for UI
  - start in `packages/agents` for agent tooling/prompting
