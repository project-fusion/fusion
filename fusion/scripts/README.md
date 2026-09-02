# @fusion.dev/scripts

What more than one package's build needs and no one package owns. **Private**:
it is the workspace's own tooling.

| Export | What it answers |
|---|---|
| `./workspace` | Where things are, so a generator does not hardcode a path |
| `./formatted` | Runs biome over generated text, so nothing lands unformatted |
| `./compositions` | Which families compose which, read from the manifests |
| `./format-open-tags` | The one-attribute-per-line shape examples are written in |
| `./paint`, `./theme-facts`, `./theme-intents` | The theme engine's shared vocabulary |

The `.mjs` files beside them are the generators themselves, run as turbo tasks
rather than imported: `build-elements-css.mjs`, `build-metrics.mjs`,
`build-element-events.mjs` and the rest. They resolve their own paths from
`import.meta.dirname`, so a `package.json` script never names a path out of its
own package, which `fusion workspace`'s `reaching` rule holds them to.

**Everything runs under bun**, including the files with a `#!/usr/bin/env node`
shebang. There is no Node on a CI runner for `verify`.
