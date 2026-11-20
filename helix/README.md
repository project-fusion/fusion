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
| `native` | `helix-native` | the React Native runtime the components draw with: the renderer, the machines, the theme, and a phone's capabilities |
| `plot` | `helix-plot` | draws the spatial charts in three dimensions with three.js |
| `sandbox` | `helix-sandbox` | the sandbox's source editor, and a code highlighter for Code Block |
| `speech` | `helix-speech` | recognizes dictation in the page, on the device, with Moonshine |
| `styled` | `helix` | the headless tier with token-driven presentation |
| `styles` | `helix-styles` | tokens and the base layer, pure CSS |
| `templates` | `helix-templates` | the project templates `helix new` scaffolds from |
| `theme` | `helix-theme` | the derivation engine, Rust compiled to WASM |
| `plugin` | the `helix` Claude Code plugin | the agent guide as a skill, and the Helix MCP server |
| `visual` | in `helix-cli` | the Rust crate behind `helix visual` |
| `app` | none | the gallery on a phone: each family with a native version, and its examples, in Expo Go |
| `cem` | none | writes the framework typings from a Helix manifest |
| `gallery` | none | rendered component images for the documentation |
| `neutral` | none | each family's platform-neutral source, which `helix system` compiles for the web and React Native |
| `testing` | none | the spec harness the other packages share |
| `workbench` | none | the spec runner and the JSX reader behind the sandbox page on fusion.dev |

**The two tiers are the shape of the whole library.** `headless` owns everything
that is hard to get right and invisible when it is wrong; `styled` owns
everything about how it looks. A consumer takes one or the other, and taking the
headless tier is a supported way to build a design system that is not ours.

Conventions for this folder are in [CONVENTIONS.md](CONVENTIONS.md), and they load
automatically for work under `helix/**`.
