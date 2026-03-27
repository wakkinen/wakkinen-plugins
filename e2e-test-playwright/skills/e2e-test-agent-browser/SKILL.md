---
name: e2e-test-agent-browser
description: End-to-end browser testing using Vercel's agent-browser CLI (native Rust). Faster startup than Playwright, no Node.js runtime needed. Integrates with superpowers plugin for planning, parallel agents, code review, and verification. Run after implementation to validate UI, user journeys, and database integrity before code review.
disable-model-invocation: false
---

# E2E Browser Testing with agent-browser

> **Requires:** `agent-browser` globally installed (`npm install -g agent-browser && agent-browser install`)
> **Requires:** superpowers plugin (planning, parallel dispatch, verification)

## Browser CLI Reference

`agent-browser` is a native Rust binary — fast startup, no Node.js runtime for the daemon.

```bash
AB="agent-browser"

$AB open <url>                    # Launch browser + navigate
$AB snapshot                      # Full accessibility tree
$AB snapshot -i                   # Interactive elements with refs (@e1, @e2...)
$AB click @eN                     # Click element by ref
$AB fill @eN "text"               # Clear field and type
$AB type @eN "text"               # Type into element (appends)
$AB select @eN "value"            # Select dropdown
$AB press Enter                   # Key press (Enter, Tab, Escape, etc.)
$AB screenshot <path>             # Save screenshot
$AB screenshot --annotate         # Screenshot with numbered element labels
$AB screenshot --full             # Full page screenshot
$AB set viewport <w> <h>          # Set viewport size
$AB wait --load networkidle       # Wait for page settle
$AB wait --text "Welcome"         # Wait for text to appear
$AB wait <selector>               # Wait for element visible
$AB get text @eN                  # Get element text
$AB get url                       # Current URL
$AB get title                     # Page title
$AB get value @eN                 # Input value
$AB find role button click --name "Submit"  # Semantic locator
$AB find text "Sign In" click     # Find by text and act
$AB eval <js>                     # Run JavaScript
$AB tab                           # List tabs
$AB tab new [url]                 # New tab
$AB connect <port>                # Connect to existing browser via CDP
$AB close                         # End session
$AB close --all                   # Close all sessions
```

### Batch Execution (reduce overhead)

For multi-step sequences, use batch mode to avoid per-command process startup:

```bash
echo '[
  ["open", "https://localhost:3000"],
  ["snapshot", "-i"],
  ["click", "@e1"],
  ["screenshot", "result.png"]
]' | agent-browser batch --json
```

### Key Differences from pw-browser.js (Playwright)

| Feature | agent-browser | pw-browser.js |
|---------|--------------|---------------|
| Runtime | Native Rust binary | Node.js + Playwright |
| Startup | Fast (~50ms) | Slower (~500ms) |
| Browser | Chrome for Testing | Playwright Chromium |
| Headed mode | Not supported (headless only) | `--headed` flag |
| Network mocking | `network route` commands | Not built-in |
| Batch mode | `batch --json` | Not available |
| Semantic locators | `find role/text/label` | Not built-in |
| Refs format | `@e1` (from snapshot) | `@e1` (from snapshot) |

> [!important]
> **Refs become invalid after navigation or DOM changes.** Always re-snapshot after page navigation, form submissions, or dynamic content updates.

## Pre-flight Check

### 1. Verify Frontend Exists
Check for `package.json` with dev/start script, frontend framework files, or web server config. If no browser-accessible UI → stop.

### 2. Verify agent-browser Available
```bash
agent-browser --version
```
If not installed: `npm install -g agent-browser && agent-browser install`

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

# Wait for server to be ready
agent-browser open http://localhost:3000
agent-browser wait --load networkidle
agent-browser screenshot e2e-screenshots/00-initial-load.png
```

### Phase 4: Execute — Use superpowers:executing-plans + agent-browser

For each task in the plan, follow superpowers:executing-plans structure but add browser testing:

**For each user journey step:**

1. `agent-browser snapshot -i` — get current interactive elements
2. Perform the interaction (`click`, `fill`, `select`, `press`)
3. `agent-browser wait --load networkidle` — let page settle
4. `agent-browser screenshot e2e-screenshots/<journey>/<step>.png` — capture state
5. **Read the screenshot** — analyze for visual correctness, UX issues, broken layouts
6. Check for JS errors: `agent-browser eval "JSON.stringify(window.__errors || [])"` or check console
7. **Query database** — verify records match UI actions (use Agent 2's validation queries)

**When issues found:**
1. Document: expected vs actual, screenshot path, DB query results
2. Fix the code directly
3. Re-run the failing step
4. Screenshot the fix confirmation

**Responsive testing (final task):**
```bash
agent-browser set viewport 375 812    # Mobile
agent-browser screenshot e2e-screenshots/responsive/mobile-<page>.png

agent-browser set viewport 768 1024   # Tablet
agent-browser screenshot e2e-screenshots/responsive/tablet-<page>.png

agent-browser set viewport 1440 900   # Desktop
agent-browser screenshot e2e-screenshots/responsive/desktop-<page>.png
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
agent-browser close    # End browser session
# Stop dev server
```

**Output summary:**
```
## E2E Testing Complete

**Tool:** agent-browser (native Rust CLI)
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
