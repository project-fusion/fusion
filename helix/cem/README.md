# @fusion.dev/helix-cem

The analyzer configuration and the Helix plugins that read a component into its
manifest. **Private**: build tooling for this repository.

Every package that ships custom elements calls `createHelixCemConfig({ tier })`
rather than configuring the analyzer itself, so a new plugin is added once here
instead of being copied into each package and drifting.

| Plugin | What it adds to the manifest |
|---|---|
| `helix-tier` | Which tier a declaration belongs to |
| `helix-composition` | The family and the part, derived from the module path |
| `helix-metadata` | `@since`, `@status`, `@category`, `@aliases`, `@documentation` |
| `helix-examples` | The slugs under a family's `.examples`, and their summaries |
| `helix-source` | The family's source directory, as a path and never a URL |

**Each package names its config on the command line**, `cem.config.ts` rather
than the `custom-elements-manifest.config.*` the analyzer discovers. An
`analyze` script that loses its `--config` does not fail: it runs with the
analyzer's defaults and writes a manifest with none of these plugins in it.

`dependencies: true` is set, which is what lets inheritance resolve across
packages, so every package shipping extendable classes needs its own manifest.
