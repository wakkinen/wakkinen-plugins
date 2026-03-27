# wakkinen-plugins

Personal Claude Code plugin marketplace — custom skills and tools.

## Plugins

### e2e-test-playwright
Comprehensive E2E browser testing skill leveraging Playwright and superpowers plugin. Adapted from [Cole Medin's e2e-test skill](https://github.com/coleam00/link-in-bio-page-builder/blob/main/.claude/skills/e2e-test/SKILL.md). Supports two modes: **CLI (default)** for lower token usage via `pw-browser.js`, or **MCP** for richer but token-heavy native browser tools. CLI mode recommended per feedback from Rajesh Godavarthi.

**Requires:**
- [Superpowers](https://github.com/obra/superpowers) (`/plugin install superpowers@claude-plugins-official`)
- Playwright installed (`npm install -g playwright && npx playwright install chromium`)
- Optional: [Playwright MCP](https://github.com/anthropics/claude-plugins-official/tree/main/external_plugins/playwright) (`/plugin install playwright@claude-plugins-official`) — only needed for MCP mode

### e2e-test-agent-browser *(experimental)*
E2E browser testing using [Vercel's agent-browser](https://github.com/vercel-labs/agent-browser) CLI — a native Rust binary. Same 7-phase workflow as e2e-test-playwright but faster startup, no Node.js runtime needed, plus batch mode and network interception.

**Requires:**
- `agent-browser` installed (`npm install -g agent-browser && agent-browser install`)
- [Superpowers](https://github.com/obra/superpowers) (`/plugin install superpowers@claude-plugins-official`)

**Status:** Testing alongside e2e-test-playwright before replacing it.

### mission-control-hooks
Claude Code session registration hooks for [Mission Control dashboard](https://github.com/wakkinen/OpenClawCustomDashboard). No skills — hooks only. Registers each Claude Code session on start, deregisters on stop. Sends project name, PID, and working directory to `localhost:7777/api/agents`.

**No dependencies.** Silently does nothing if the dashboard isn't running.

## Installation

Add this marketplace to Claude Code:

```
/plugin marketplace add wakkinen/wakkinen-plugins
```

Install a plugin:

```
/plugin install e2e-test-playwright@wakkinen-plugins
/plugin install e2e-test-agent-browser@wakkinen-plugins
/plugin install mission-control-hooks@wakkinen-plugins
```

### Post-Install Setup (e2e-test-playwright)

**Recommended: Global install** (survives plugin updates):
```
npm install -g playwright
npx playwright install chromium
```

**Alternative: Local install** (must redo after each plugin version update):
```
cd C:\Users\<YOU>\.claude\plugins\cache\wakkinen-plugins\e2e-test-playwright\<version>\tools
npm install
npx playwright install chromium
```

To find your exact cache path:
```
dir %USERPROFILE%\.claude\plugins\cache\wakkinen-plugins\e2e-test-playwright\
```

### Features (e2e-test-playwright)
- **CLI mode (default)** — `pw-browser.js` wrapper, one shell exec per action, low token usage
- **MCP fallback** — If CLI unavailable and Playwright MCP plugin installed, falls back automatically
- **`PW_MODE` override** — Set `PW_MODE=cli` or `PW_MODE=mcp` to force a mode
- **`--headed` flag** — Watch the browser in real-time with `--headed` or `PW_HEADED=1`

### Features (e2e-test-agent-browser)
- **Native Rust CLI** — ~50ms startup vs ~500ms for Node.js/Playwright
- **Batch mode** — Pipe JSON arrays of commands to reduce per-command overhead
- **Semantic locators** — `find role/text/label` for ARIA-based element selection
- **Network interception** — Mock responses, block requests, HAR recording
- **No headed mode** — Headless only (trade-off for speed)

## Adding New Plugins

Each plugin lives in its own directory with:
```
plugin-name/
  .claude-plugin/
    plugin.json          # Plugin manifest
  skills/
    skill-name/
      SKILL.md           # Skill definition
  tools/                 # Optional helper scripts
```

Update `.claude-plugin/marketplace.json` to register new plugins.
