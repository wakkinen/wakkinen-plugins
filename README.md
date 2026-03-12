# wakkinen-plugins

Personal Claude Code plugin marketplace — custom skills and tools.

## Plugins

### e2e-test-playwright
Comprehensive E2E browser testing skill leveraging Playwright MCP and superpowers plugin. Adapted from [Cole Medin's e2e-test skill](https://github.com/coleam00/link-in-bio-page-builder/blob/main/.claude/skills/e2e-test/SKILL.md) — replaces agent-browser with Playwright MCP for native Windows support and delegates planning, parallel agents, code review, and verification to superpowers.

**Requires:**
- [Playwright MCP](https://github.com/anthropics/claude-plugins-official/tree/main/external_plugins/playwright) (`/plugin install playwright@claude-plugins-official`)
- [Superpowers](https://github.com/obra/superpowers) (`/plugin install superpowers@claude-plugins-official`)

## Installation

Add this marketplace to Claude Code:

```
/plugin marketplace add wakkinen/wakkinen-plugins
```

Install a plugin:

```
/plugin install e2e-test-playwright@wakkinen-plugins
```

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
