# wakkinen-plugins

Personal Claude Code plugin marketplace — custom skills and tools.

## Plugins

### e2e-test-playwright
End-to-end browser testing using Playwright MCP + superpowers integration. Launches parallel research agents to analyze your codebase, plans test journeys, then systematically tests every UI flow with screenshots, database validation, and responsive checks.

**Requires:**
- Playwright MCP plugin (`/plugin install playwright@claude-plugins-official`)
- Superpowers plugin (`/plugin install superpowers@claude-plugins-official`)

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
