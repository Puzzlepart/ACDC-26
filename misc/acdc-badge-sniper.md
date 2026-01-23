# Skill: acdc-badge-sniper

A skill for teams competing in **Arctic Cloud Developer Challenge (ACDC)** that helps maximize badge points and improve chances of winning judge category awards.

---

## 1) What should “acdc-badge-sniper” do (plain terms)?

**Turn the badge + category lists into an action plan.**

Given what the team has built (or plans to build), this skill should:

- Identify the **best next badges/awards to target** (highest ROI / fastest points / best fit).
- Produce a **time-boxed checklist** to earn them (next 1–3 hours, today, rest of hackathon).
- Explain **exactly what evidence** to prepare (demo steps, screenshots, repo notes, links, write-up bullets).
- Map recommended work to **judge categories** (business value, governance, low-code, data/analytics, tech depth, AI/agents).
- Flag **dependencies and risks** (what needs admin access, server settings, approvals, data, etc.).
- Output a **“judge pitch” mini-script** for each targeted badge/category: what we did, why it matters, and how to verify.

**Key behavior:** don’t just list badges — produce *actionable* “do this → show that → claim this” guidance.

---

## 2) Example user prompts that should trigger it

1. “We have an SPFx dashboard, Graph orchestration, and an agent in Minecraft. Which badges can we claim today and what proof do we need?”
2. “Make a 3-hour badge-sniping plan: fast badges first, then one ‘judge-magnet’ category award.”
3. “We’re mostly Power Platform (Canvas app + Power Automate). What badges and award category should we aim for?”
4. “Here’s our repo + demo outline. Tell me which badges/categories we match, what we’re missing, and the smallest changes to qualify.”

---

## 3) Required tools/APIs/files it should use (or avoid)

### Should use
- **web.run**: fetch the *current* ACDC badge list + category descriptions from:
  - https://www.arcticclouddeveloperchallenge.net/badges-categories  
  (Reason: badges/rules can change and must be current.)

### Optional (nice-to-have)
- Local cache file (generated at runtime) for offline/spotty Wi‑Fi:
  - `skills/acdc-badge-sniper/data/badges_snapshot.json`
- Simple scoring config:
  - `skills/acdc-badge-sniper/config.yml` (weights for time/effort/impact/fit)

### Should avoid
- Anything that **auto-posts** to social media, spams other teams, or submits claims automatically.
- Any “cheating” guidance (e.g., misleading evidence). Keep it aligned with hackathon spirit.

---

## 4) Where to create it

✅ **Yes** — create the skill in:

`/Users/damsleth/Code/CCC/skills/acdc-badge-sniper`

Then package it afterward once prompts + outputs look solid and you’ve validated against the current badge list.

---

## Suggested I/O contract (for the skill-creator)

### Inputs the skill should ask for (minimal)
- Team stack: (M365 / Power Platform / Azure / Fabric / AI / DevOps / Minecraft integration)
- What’s built now (bullets) + what’s feasible next
- Time left / time-box (e.g., “2 hours”)
- Constraints (no admin, no internet, no server changes, etc.)

### Outputs the skill should produce
- Top **5 badge targets** (ranked) + top **1–2 award categories**
- For each target:
  - Why we match
  - What’s missing (if anything)
  - Step-by-step checklist
  - Evidence to collect
  - Judge/demo script (30–60 sec)
- A single “Next 60 minutes” task list

---

## Guardrails

- If badge requirements are ambiguous, the skill should **quote/point to the exact wording** from the official page and suggest a safe interpretation.
- Prefer “fast wins” early, but always include at least one “judge-magnet” recommendation aligned to the project’s strongest theme.
