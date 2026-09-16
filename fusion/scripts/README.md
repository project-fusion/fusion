# @fusion.dev/scripts

What more than one package's build needs and no one package owns. **Private**:
it is the workspace's own tooling.

| Export | What it answers |
|---|---|
| `./argv` | `--name value` and `--name`, read the one way |
| `./cost` | What a family costs a browser check, measured, so the shards are packed by time |
| `./emit` | Writes a generated file, or under `--check` says which lines are behind |
| `./format-open-tags` | The one-attribute-per-line shape examples are written in |
| `./formatted` | Runs biome over generated text, so nothing lands unformatted |
| `./frontmatter` | The `key: value` block at the top of an MDX file, as strings |
| `./literal` | Text as a quoted string or a template literal in a generated module |
| `./paint`, `./theme-facts`, `./theme-intents` | The theme engine's shared vocabulary |
| `./pool` | Running a browser check's families side by side, on a fresh page each or one per worker, reaching nothing but their own origin |
| `./scope` | Which families a change reaches, for the checks that compare examples |
| `./settle` | Waiting for an example to stop changing before it is photographed |
| `./shard` | Which of a browser check's families a CI job takes, when one check is split across several |
| `./workspace` | Where things are, so a generator does not hardcode a path |

The `.mjs` files beside them are the generators themselves, run as turbo tasks
rather than imported: `build-elements-css.mjs`, `build-metrics.mjs`,
`build-element-events.mjs` and the rest. They resolve their own paths from
`import.meta.dirname`, so a `package.json` script never names a path out of its
own package, which `fusion workspace`'s `reaching` rule holds them to.

**Everything runs under bun**, including the files with a `#!/usr/bin/env node`
shebang. There is no Node on a CI runner for `verify`.
