# helix/plugin

Helix's plugin for Claude Code: the guide to writing pages with Helix, as a
skill, and the Helix MCP server.

```sh
claude plugin marketplace add project-fusion/fusion
claude plugin install helix@fusion
```

| Here | What it is |
|---|---|
| `.claude-plugin/plugin.json` | The manifest. A release stamps its `version` with Helix's |
| `skills/helix/SKILL.md` | The guide, written by `fusion/scripts/build-plugin.mjs` from the one `@fusion.dev/helix` ships, and held to it by `check:gen:eval` |
| `.mcp.json` | The MCP server: `npx @fusion.dev/helix-cli mcp`, the command line the project installs |

The marketplace that lists it is `.claude-plugin/marketplace.json` at the
repository root.
