# @fusion.dev/helix-cli

The Helix command line. Holds components to the conventions Helix is built on,
derives themes, scaffolds a project, and serves the derivation to an agent.

```sh
npm install --save-dev @fusion.dev/helix-cli
```

The command is a native binary, and npm installs the build for your machine
beside this package: macOS and Linux on Arm and x86-64, and Windows on x86-64.
An install that skips optional dependencies skips it too, and `helix` then names
the package it's missing. To start a project rather than add Helix to one, use
`npm create @fusion.dev/helix-app`.

```sh
helix component check      # the CI shape: nothing printed on success
helix component audit      # every rule and what it found
helix component fix        # the rules that can write
```

| Verb | What it does |
|---|---|
| `component` | Holds components to the conventions. `--only <rule>` runs one of `attributes` `axes` `corners` `events` `hooks` `parts` `reflected` `seeds` `selectors` `ssr` `stable` `tokens` and the rest |
| `theme` | `init` a starter intent, `build` it to CSS, `audit` every contrast pair, `check` in CI |
| `new` | Scaffolds a project from a Helix template |
| `diagnostics` | Receives the runs `initDiagnostics()` sends from your app and prints each new finding. `--out <path>` writes the CI file, `--port` picks the port, 7417 by default, and `--config <path>` names the settings served to the page |
| `mcp` | Serves the derivation to an agent over stdio, as an MCP server |

`--json` is on every verb, in a shape a script can read without parsing
sentences: the rules, their counts and their findings. `--no-color` is the third
way to turn color off, for a terminal that reports itself capable and is not.
Color is already off when stdout is not a terminal and when `NO_COLOR` is set.

`helix --version` is the release you installed, read from the package it came in
rather than compiled into the binary, so one build serves every release that
changes no Rust. A binary built from a checkout of this repository has no such
package beside it and says `0.0.0-dev`, which is what that build is.

## What it reads

`component` reads the tiers named by a `helix` key in `fusion.json`, or by
`helix.json` where the Fusion CLI is not in use. A rule that needs a
manifest says so rather than reporting a clean tree it never looked at, so a
fresh clone wants `bun run analyze` before the rules that read one mean anything.

## Two shapes, one measurement

`audit` prints every rule and exits 1 on a finding. `check` runs the same
measurement and prints nothing on success. Use `audit` while you work and
`check` in CI, and never both in one script: the difference is what is printed,
never what is judged.

[Documentation](https://fusion.dev/helix)

MIT
