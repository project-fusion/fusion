# helix/

**Helix**, the design system: a library of web components that derives its own
accessible palette.

Packages are flat inside this folder, one directory each. Most publish to npm
under `@fusion.dev/*`. The table says how each of the rest ships, or that it is
internal to the build.

| Package | Publishes as | What it is |
|---|---|---|
| `cli` | `helix-cli` | `helix`, the Rust command line, and the visual tests it runs. [npm/README.md](cli/npm/README.md) lists its verbs |
| `create-app` | `create-helix-app` | `npm create @fusion.dev/helix-app`, which runs `helix new` |
| `core` | `helix-core` | base classes, mixins, decorators, utilities |
| `diagnostics` | `helix-diagnostics` | finds the mistakes that are valid CSS |
| `docs` | `helix-docs` | the documentation as content, versioned with the library |
| `graph` | `helix-graph` | connects the Graph frame to a graph renderer, such as Sigma.js or cosmos.gl |
| `headless` | `helix-headless` | behavior, accessibility and form participation, no styling |
| `icons` | `helix-icons` | the icon set |
| `map` | `helix-map` | connects the Map frame to a map renderer, such as MapLibre or Leaflet |
| `plot` | `helix-plot` | draws the spatial charts in three dimensions with three.js |
| `styled` | `helix` | the headless tier with token-driven presentation |
| `styles` | `helix-styles` | tokens and the base layer, pure CSS |
| `templates` | `helix-templates` | the project templates `helix new` scaffolds from |
| `theme` | `helix-theme` | the derivation engine, Rust compiled to WASM |
| `plugin` | the `helix` Claude Code plugin | the agent guide as a skill, and the Helix MCP server |
| `visual` | in `helix-cli` | the Rust crate behind `helix visual` |
| `cem` | none | writes the framework typings from a Helix manifest |
| `gallery` | none | rendered component images for the documentation |
| `sandbox` | none | the live editor embedded in the docs |
| `testing` | none | the spec harness the other packages share |

**The two tiers are the shape of the whole library.** `headless` owns everything
that is hard to get right and invisible when it is wrong; `styled` owns
everything about how it looks. A consumer takes one or the other, and taking the
headless tier is a supported way to build a design system that is not ours.

Conventions for this folder are in [CONVENTIONS.md](CONVENTIONS.md), and they load
automatically for work under `helix/**`.
