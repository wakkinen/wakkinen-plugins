---
name: e2e-test-playwright
description: End-to-end browser testing using Playwright MCP tools. Integrates with superpowers plugin for planning, parallel agents, code review, and verification. Run after implementation to validate UI, user journeys, and database integrity before code review.
disable-model-invocation: true
---

# E2E Browser Testing with Playwright MCP

> **Requires:** Playwright MCP plugin (browser tools) + superpowers plugin (planning, parallel dispatch, verification)

## Playwright MCP Tools

These are available as native tools via the Playwright MCP server:

| Tool | What it does |
|------|-------------|
| `browser_navigate` | Navigate to a URL |
| `browser_snapshot` | Get page accessibility snapshot (interactive elements) |
| `browser_click` | Click an element (by ref from snapshot) |
| `browser_type` | Type text into an input field |
| `browser_select_option` | Select a dropdown option |
| `browser_press_key` | Press a keyboard key |
| `browser_screenshot` | Take a screenshot (returns image) |
| `browser_hover` | Hover over an element |
| `browser_drag` | Drag from one element to another |
| `browser_wait_for_page` | Wait for page to settle |
| `browser_go_back` | Browser back button |
| `browser_go_forward` | Browser forward button |
| `browser_console_messages` | Get console log messages |
| `browser_resize` | Resize viewport |
| `browser_tab_new` | Open new tab |
| `browser_tab_select` | Switch between tabs |
| `browser_tab_close` | Close a tab |

**Element refs** come from `browser_snapshot` — always re-snapshot after navigation or DOM changes.

## Pre-flight Check

### 1. Verify Frontend Exists

Check for `package.json` with dev/start script, frontend framework files, or web server config. If no browser-accessible UI → stop.

### 2. Verify Playwright MCP Available

Check that browser tools are available:
- Try `browser_navigate` to a test URL
- If unavailable, tell user to install: `/plugin install playwright@claude-plugins-official`

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

1. Start dev server using Agent 1's instructions (background process)
2. Wait for server to be ready
3. `browser_navigate` to the app URL
4. `browser_screenshot` — save initial load verification
5. `browser_snapshot` — verify interactive elements are present

### Phase 4: Execute — Use superpowers:executing-plans + Playwright MCP

For each task in the plan, follow superpowers:executing-plans structure but add browser testing:

**For each user journey step:**

1. `browser_snapshot` — get current interactive elements with refs
2. Perform the interaction (`browser_click`, `browser_type`, `browser_select_option`, `browser_press_key`)
3. `browser_wait_for_page` — let page settle
4. `browser_screenshot` — capture current state
5. **Analyze the screenshot** — check for visual correctness, UX issues, broken layouts, missing content, error states
6. `browser_console_messages` — check for JS errors
7. **Query database** — verify records match UI actions (use Agent 2's validation queries)

**When issues found:**
1. Document: expected vs actual, screenshot, DB query results
2. Fix the code directly
3. Re-run the failing step
4. Screenshot the fix confirmation

**Responsive testing (final task):**
```
browser_resize width=375, height=812    → Mobile
browser_screenshot                       → Capture each major page

browser_resize width=768, height=1024   → Tablet
browser_screenshot                       → Capture each major page

browser_resize width=1440, height=900   → Desktop
browser_screenshot                       → Capture each major page
```

Analyze screenshots for layout issues, overflow, broken alignment, and touch target sizes on mobile.

### Phase 5: Verify — Use superpowers:verification-before-completion

Before claiming E2E testing is complete:
1. Run full test suite — show output, count failures
2. Review all screenshots captured
3. Verify all DB validation queries pass
4. Check no JS errors remain in `browser_console_messages`
5. **Evidence before claims, always.**

### Phase 6: Review — Use superpowers:requesting-code-review

If bugs were fixed during testing, request code review from the code-reviewer agent before committing.

### Phase 7: Report

**Output summary:**
```
## E2E Testing Complete

**Journeys Tested:** [count]
**Screenshots Captured:** [count]
**Issues Found:** [count] ([count] fixed, [count] remaining)

### Issues Fixed During Testing
- [Description] - [file:line]

### Remaining Issues
- [Description] - [severity] - [file:line]

### Screenshots
Captured inline during testing session.
```

Ask user if they want a detailed markdown report exported to `e2e-test-report.md`.
