# @fusion.dev/helix-cli

The Helix command line. Derives themes, scaffolds a project, checks a project's
code against the Helix it installed, pictures its pages against baselines kept
in git, looks up the installed packages, and serves all of it to an agent.

```sh
npm install --save-dev @fusion.dev/helix-cli
```

The command is a native binary, and npm installs the build for your machine
beside this package: macOS and Linux on Arm and x86-64, and Windows on x86-64.
An install that skips optional dependencies skips it too. `helix` then runs a
`helix` on your `PATH` whose `helix --version --json` names this package, and
otherwise names the package that is missing and each `helix` it did not run,
such as the Helix text editor. To start a new project with Helix, use
`npm create @fusion.dev/helix-app`.

```sh
helix scan                 # your code, judged against the Helix you installed
helix theme audit          # every contrast pair in your theme
helix mcp init --client claude
```

| Verb | What it does |
|---|---|
| `component` | Checks the components you build on Helix's base classes: registration under your prefix, imports, slots, parts, states, hooks, words, reflection, attribute names, lifecycle, and listeners. Reads the folders named by `tiers` in `helix.json`. `--only <rule>` runs some of them |
| `theme` | `init` a starter intent, `build` it to CSS, `audit` every contrast pair, `check` in CI |
| `new` | Scaffolds a project from a Helix template: `helix new my-app --template react-vite`. The templates install with the CLI, in `@fusion.dev/helix-templates`, so `npx @fusion.dev/helix-cli new` works from an empty directory. Omit `--template` to list them |
| `diagnostics` | Receives the runs `initDiagnostics()` sends from your app and prints each new finding. `--once <url>` opens a page headless instead, diagnoses it, and exits. `--out <path>` writes the CI file, `--port` picks the port, 7417 by default, and `--config <path>` names the settings served to the page |
| `scan` | Reads your project's stylesheets, templates, and modules, and prints each finding with its file and line. `--build <dir>` weighs each Helix family in your bundle, `--out <path>` writes the run to the CI file, `--config <path>` names the settings, `--file <path>` reports one file's findings, and `--stdin <language>` checks a snippet |
| `shared` | Checks the code an Expo app shares between the web and a phone, every module except those named `.web.tsx` or `.native.tsx`, for what only the web has: `document`, `window`, and the other browser globals, DOM elements such as `div` and `span`, `className`, a `style` React Native does not take, stylesheet imports, and the Helix families, props, and events a phone does not draw. Takes the files and folders to read, `helix shared app` for an Expo Router app. Exits 1 on a finding |
| `api` | Looks up the installed Helix packages: `find` a family, a `family`'s API, an `example` with its imports, the `imports` for a list of tags, and `tokens` |
| `manifest` | `diff` compares two custom elements manifests and prints each difference. Exits 1 on any difference |
| `visual` | Pictures each page in a real browser and compares it with a baseline kept in git: `test`, `update` the baselines, open the `report`, and `compare` two PNG files. Reads `visual.config.ts`, and needs Playwright installed. [The guide](https://github.com/project-fusion/fusion/blob/main/helix/cli/npm/visual/README.md), also in this package at `visual/README.md`, has the config and the GitHub Action |
| `mcp` | Serves the same lookups, the scan, and the theme derivation to an agent over stdio, as an MCP server. `mcp init --client <client>` writes the configuration for Claude Code, Cursor, VS Code, Gemini CLI, opencode, Roo Code, or Junie |

`--json` is on every verb, in a shape a script can read without parsing
sentences. `--no-color` is the third
way to turn color off, for a terminal that reports itself capable and is not.
Color is already off when stdout is not a terminal and when `NO_COLOR` is set.

`helix --version` is the release you installed, read from the package it came in
rather than compiled into the binary, so one build serves every release that
changes no Rust. A binary built from a checkout of this repository has no such
package beside it and says `0.0.0-dev`, which is what that build is.
`helix --version --json` prints the same release as
`{ "name": "helix", "package": "@fusion.dev/helix-cli", "version": … }`.

[Documentation](https://fusion.dev/helix)

MIT
