# wakkinen-plugins

Personal Claude Code plugin marketplace — custom skills and tools.

## Plugins

### e2e-test-playwright
Comprehensive E2E browser testing skill leveraging Playwright and superpowers plugin. Adapted from [Cole Medin's e2e-test skill](https://github.com/coleam00/link-in-bio-page-builder/blob/main/.claude/skills/e2e-test/SKILL.md). Supports two modes: **CLI (default)** for lower token usage via `pw-browser.js`, or **MCP** for richer but token-heavy native browser tools. CLI mode recommended per feedback from Rajesh Godavarthi.

**Requires:**
- [Superpowers](https://github.com/obra/superpowers) (`/plugin install superpowers@claude-plugins-official`)
- Optional: [Playwright MCP](https://github.com/anthropics/claude-plugins-official/tree/main/external_plugins/playwright) (`/plugin install playwright@claude-plugins-official`) — only needed for MCP mode

## Installation

Add this marketplace to Claude Code:

```
/plugin marketplace add wakkinen/wakkinen-plugins
```

Install a plugin:

```
/plugin install e2e-test-playwright@wakkinen-plugins
```

### Post-Install Setup (e2e-test-playwright)

After installing, Playwright needs to be set up in the plugin's tools directory:

```
cd C:\Users\<YOU>\.claude\plugins\cache\wakkinen-plugins\e2e-test-playwright\<version>\tools
npm install
npx playwright install chromium
```

To find your exact path:
```
dir %USERPROFILE%\.claude\plugins\cache\wakkinen-plugins\e2e-test-playwright\
```

This only needs to be done once (and again after major version updates).

### Features
- **CLI mode (default)** — `pw-browser.js` wrapper, one shell exec per action, low token usage
- **MCP fallback** — If CLI unavailable and Playwright MCP plugin installed, falls back automatically
- **`PW_MODE` override** — Set `PW_MODE=cli` or `PW_MODE=mcp` to force a mode
- **`--headed` flag** — Watch the browser in real-time with `--headed` or `PW_HEADED=1`
- **Mission Control hooks** — Registers/deregisters Claude Code sessions with the dashboard on start/stop

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
