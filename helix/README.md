# helix/

**Helix**, the design system: a library of web components that derives its own
accessible palette.

Packages are flat inside this folder, one directory each. Eight publish to npm
under `@fusion.dev/*` and the rest are internal to the build.

| Package | Publishes as | What it is |
|---|---|---|
| `styles` | `helix-styles` | tokens and the base layer, pure CSS |
| `theme` | `helix-theme` | the derivation engine, Rust compiled to WASM |
| `core` | `helix-core` | base classes, mixins, decorators, utilities |
| `headless` | `helix-headless` | behavior, accessibility and form participation, no styling |
| `styled` | `helix` | the headless tier with token-driven presentation |
| `icons` | `helix-icons` | the icon set |
| `diagnostics` | `helix-diagnostics` | finds the mistakes that are valid CSS |
| `docs` | `helix-docs` | the documentation as content, versioned with the library |
| `cem` | — | the custom elements manifest analyzer plugins |
| `gallery` | — | rendered component images for the documentation |
| `sandbox` | — | the live editor embedded in the docs |
| `testing` | — | the spec harness the other packages share |
| `cli` | — | `helix`, the Rust command line: `component`, `theme`, `mcp` |

**The two tiers are the shape of the whole library.** `headless` owns everything
that is hard to get right and invisible when it is wrong; `styled` owns
everything about how it looks. A consumer takes one or the other, and taking the
headless tier is a supported way to build a design system that is not ours.

Conventions for this folder are in `.claude/rules/helix.md`, and it loads
automatically for work under `helix/**`.
