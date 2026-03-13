---
name: e2e-test-playwright
description: End-to-end browser testing using Playwright. Supports two modes — CLI (default, lower token usage) and MCP (richer but token-heavy). Integrates with superpowers plugin for planning, parallel agents, code review, and verification. Run after implementation to validate UI, user journeys, and database integrity before code review.
disable-model-invocation: false
---

# E2E Browser Testing with Playwright

> **Requires:** superpowers plugin (planning, parallel dispatch, verification)
> **Browser Mode:** CLI (default) or MCP (optional, higher token usage)

## Browser Modes

### CLI Mode (Default) — Lower Token Usage
Uses `pw-browser.js` CLI wrapper. One shell exec per action = fewer tokens.

```
PW="node <skill-directory>/tools/pw-browser.js"

$PW open <url>                    # Launch browser + navigate
$PW open <url> --headed           # Launch VISIBLE browser
$PW navigate <url>                # Navigate within session
$PW snapshot -i                   # Get interactive elements (@e1, @e2...)
$PW click @eN                     # Click element by ref
$PW fill @eN "text"               # Fill input field
$PW select @eN "value"            # Select dropdown
$PW press Enter                   # Key press
$PW screenshot <path>             # Save screenshot
$PW screenshot <path> --annotate  # Screenshot with numbered labels
$PW viewport 375 812              # Set viewport (mobile/tablet/desktop)
$PW wait networkidle              # Wait for page settle
$PW console                       # JS console log
$PW errors                        # JS errors
$PW text @eN                      # Get element text
$PW url                           # Current URL
$PW close                         # End session
```

**Setup:** If `pw-browser.js` needs Playwright installed locally:
```bash
cd <skill-directory>/tools && npm install playwright && npx playwright install chromium
```

**Headed mode:** Use `--headed` flag on `open` OR set `PW_HEADED=1` env var to watch the browser in real-time.

**Refs invalidate** after navigation/DOM changes — always re-snapshot after interactions.

### MCP Mode (Optional) — Richer but Token-Heavy
If Playwright MCP plugin is installed, native browser tools are available. **Warning:** MCP mode generates many tool calls per interaction, which burns significantly more tokens. Use CLI mode unless you specifically need MCP features.

MCP tools: `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`, `browser_select_option`, `browser_press_key`, `browser_screenshot`, `browser_hover`, `browser_drag`, `browser_wait_for_page`, `browser_console_messages`, `browser_resize`, `browser_tab_new/select/close`.

To use MCP mode, install: `/plugin install playwright@claude-plugins-official`

## Pre-flight Check

### 1. Verify Frontend Exists
Check for `package.json` with dev/start script, frontend framework files, or web server config. If no browser-accessible UI → stop.

### 2. Verify Playwright Available
**CLI mode:** Check that `pw-browser.js` exists in the skill tools directory. If Playwright isn't installed, run setup (see above).

**MCP mode:** Try `browser_navigate` to a test URL. If unavailable, fall back to CLI mode.

### 3. Verify Superpowers Available
This skill delegates planning, research, and verification to superpowers. If not installed:
- `/plugin install superpowers@claude-plugins-official`

## Workflow

### Phase 1: Research — Use superpowers:dispatching-parallel-agents

Dispatch **three parallel sub-agents**:

**Agent 1 — App Structure & User Journeys:**
> Research this codebase. Return: how to start the app (exact commands, URL, port), every route/page, every user journey with step-by-step interactions and expected outcomes, all interactive UI components (forms, modals, pickers).

**Agent 2 — Database Schema & Data Flows:**
> Research the database layer. Return: DB type and connection (from .env.example, NOT .env), full schema (tables, columns, relationships), data flows per user action (what records change), validation queries for each flow.

**Agent 3 — Bug Hunt:**
> Analyze for bugs: logic errors, UI/UX issues, data integrity risks, security concerns. Return prioritized list with file paths and line numbers.

### Phase 2: Plan — Use superpowers:writing-plans

Using research from Phase 1, create an implementation plan for testing:
- One task per user journey
- Include expected DB state changes per journey
- Include related bug findings from Agent 3
- Add a final "Responsive testing" task
- Save plan to `docs/superpowers/plans/YYYY-MM-DD-e2e-testing.md`

### Phase 3: Start App & Open Browser

```bash
# Start dev server (from Agent 1's instructions)
npm run dev &

# CLI mode (default)
$PW open http://localhost:3000 --headed
$PW screenshot e2e-screenshots/00-initial-load.png

# MCP mode (if using)
# browser_navigate url="http://localhost:3000"
# browser_screenshot
```

### Phase 4: Execute — Use superpowers:executing-plans + Playwright

For each task in the plan, follow superpowers:executing-plans structure but add browser testing:

**For each user journey step (CLI mode):**

1. `$PW snapshot -i` — get current interactive elements
2. Perform the interaction (`click`, `fill`, `select`, `press`)
3. `$PW wait networkidle` — let page settle
4. `$PW screenshot e2e-screenshots/<journey>/<step>.png` — capture state
5. **Read the screenshot** — analyze for visual correctness, UX issues, broken layouts
6. `$PW console` and `$PW errors` — check for JS issues
7. **Query database** — verify records match UI actions (use Agent 2's validation queries)

**When issues found:**
1. Document: expected vs actual, screenshot path, DB query results
2. Fix the code directly
3. Re-run the failing step
4. Screenshot the fix confirmation

**Responsive testing (final task):**
```bash
$PW viewport 375 812    # Mobile
$PW screenshot e2e-screenshots/responsive/mobile-<page>.png

$PW viewport 768 1024   # Tablet
$PW screenshot e2e-screenshots/responsive/tablet-<page>.png

$PW viewport 1440 900   # Desktop
$PW screenshot e2e-screenshots/responsive/desktop-<page>.png
```

### Phase 5: Verify — Use superpowers:verification-before-completion

Before claiming E2E testing is complete:
1. Run full test suite — show output, count failures
2. Review all screenshots captured
3. Verify all DB validation queries pass
4. Check no JS errors remain
5. **Evidence before claims, always.**

### Phase 6: Review — Use superpowers:requesting-code-review

If bugs were fixed during testing, request code review from the code-reviewer agent before committing.

### Phase 7: Cleanup & Report

```bash
$PW close    # End browser session (CLI mode)
# Stop dev server
```

**Output summary:**
```
## E2E Testing Complete

**Mode:** CLI / MCP
**Journeys Tested:** [count]
**Screenshots Captured:** [count]
**Issues Found:** [count] ([count] fixed, [count] remaining)

### Issues Fixed During Testing
- [Description] - [file:line]

### Remaining Issues
- [Description] - [severity] - [file:line]

### Screenshots
All saved to: `e2e-screenshots/`
```

Ask user if they want a detailed markdown report exported to `e2e-test-report.md`.
