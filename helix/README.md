# helix/

**Helix**, the design system: a library of web components that derives its own
accessible palette.

Packages are flat inside this folder, one directory each. Most publish to npm
under `@fusion.dev/*`; the rest are internal to the build, and the table says
which is which.

| Package | Publishes as | What it is |
|---|---|---|
| `cli` | `helix-cli` | `helix`, the Rust command line: `component`, `theme`, `new`, `mcp` |
| `core` | `helix-core` | base classes, mixins, decorators, utilities |
| `diagnostics` | `helix-diagnostics` | finds the mistakes that are valid CSS |
| `docs` | `helix-docs` | the documentation as content, versioned with the library |
| `headless` | `helix-headless` | behavior, accessibility and form participation, no styling |
| `icons` | `helix-icons` | the icon set |
| `styled` | `helix` | the headless tier with token-driven presentation |
| `styles` | `helix-styles` | tokens and the base layer, pure CSS |
| `templates` | `helix-templates` | the project templates `helix new` scaffolds from |
| `theme` | `helix-theme` | the derivation engine, Rust compiled to WASM |
| `cem` | none | the custom elements manifest analyzer plugins |
| `gallery` | none | rendered component images for the documentation |
| `sandbox` | none | the live editor embedded in the docs |
| `testing` | none | the spec harness the other packages share |

**The two tiers are the shape of the whole library.** `headless` owns everything
that is hard to get right and invisible when it is wrong; `styled` owns
everything about how it looks. A consumer takes one or the other, and taking the
headless tier is a supported way to build a design system that is not ours.

Conventions for this folder are in [CONVENTIONS.md](CONVENTIONS.md), and they load
automatically for work under `helix/**`.
