# ACDC Badge Sniper: An AI Skill for Hackathon Strategy

We built an AI agent skill that helps ACDC teams identify their best badge targets and create action plans. It works with Claude Code, VS Code Copilot, and ChatGPT.

## What it does

- Fetches live ACDC data (badges, teams, claims, rankings)
- Matches your project to optimal badge targets
- Creates time-boxed checklists with evidence requirements
- Generates 30-60 second judge pitch scripts

## Installation and How to use it

### Claude Code
Drop the `acdc-badge-sniper` folder into your skills directory and invoke it.

### VS Code Copilot
Copy `copilot-instructions.md` to `.github/copilot-instructions.md` in your project, or paste it directly into Copilot Chat.

### ChatGPT / OpenAI
Use `openai-system-prompt.md` as your system prompt or Custom GPT instructions.

## Data sources

The skill uses live ACDC data and updates regularly to reflect new badges and team standings!

## Quick start

Tell your AI assistant:
1. Your team name
2. What you've built (2-6 bullets)
3. Your stack (M365, Azure, Power Platform, etc.)
4. Time remaining
5. Constraints (no admin, no external APIs, etc.)

It will return your top 5 badge targets with checklists, evidence requirements, and judge pitches.

## Get the skill

Fire up your AI assistant CLI, do `/skill`

---

*Built by the CrayCon Creepers at ACDC 2026*
