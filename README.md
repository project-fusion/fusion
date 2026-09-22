<div align="center">
  <img src=".github/fusion-logo.svg" width="88" alt="Fusion" />
  <h1>Fusion Development Group</h1>
  <p>
    <strong>Helix</strong>, a design system of web components that derives its
    own accessible palette, and <strong>Cortex</strong>, a memory and provenance
    substrate.
  </p>
  <p>
    <a href="https://fusion.dev/helix/docs">Documentation</a> ·
    <a href="https://fusion.dev/helix/components">Components</a> ·
    <a href="https://fusion.dev/helix/sandbox">Sandbox</a> ·
    <a href="https://fusion.dev/helix/theme">Theme builder</a> ·
    <a href="https://fusion.dev">fusion.dev</a>
  </p>
  <p>
    <a href="https://github.com/project-fusion/fusion/actions/workflows/verify.yml"><img src="https://github.com/project-fusion/fusion/actions/workflows/verify.yml/badge.svg?branch=main" alt="verify workflow status on main" /></a>
    <a href="https://github.com/project-fusion/fusion/actions/workflows/release.yml"><img src="https://github.com/project-fusion/fusion/actions/workflows/release.yml/badge.svg?branch=main" alt="release workflow status on main" /></a>
  </p>
</div>

## Helix

A design system of web components: tokens, a headless tier, a styled tier, and
the framework typings generated from both. The components are custom elements,
so it works in React, Vue, Svelte, Angular, or no framework at all.

```sh
bun add @fusion.dev/helix
```

Two imports at your app root, in this order, then the elements are usable
anywhere:

```ts
import '@fusion.dev/helix/helix.css'
import '@fusion.dev/helix'
```

```html
<helix-accordion separation="outlined">
  <helix-accordion-item default-open>
    <span slot="summary">What is Helix?</span>
    <p>A design system that derives its own accessible palette.</p>
  </helix-accordion-item>
</helix-accordion>
```

Two things make it different from a component library.

**Theming is derivation, not override.** You supply a handful of intent inputs
and the engine computes a complete token set whose every foreground and
background pair meets its contrast target by construction. There is no palette
to hand-check, because a derivation that could not clear a pair reports it.

**AI is a first-class consumer.** Every component is described by a custom
elements manifest with typed enums, documented parts and generated React prop
names, so an agent can write correct Helix code from the types alone. That is
why conventions like inline literal unions and documented CSS parts are enforced
at analysis time rather than left to review.

| Package | Use when |
|---|---|
| `@fusion.dev/helix` | You want Helix components as they ship |
| `@fusion.dev/helix-styles` | Always. Tokens and the base layer, and the styled tier already brings it |
| `@fusion.dev/helix-headless` | You want the behavior and none of the styling |
| `@fusion.dev/helix-theme` | You are generating or validating a theme |
| `@fusion.dev/helix-icons` | The icon set on its own |
| `@fusion.dev/helix-diagnostics` | You want the Helix mistakes that are valid CSS found for you |

[Installation](https://fusion.dev/helix/docs/installation) has the stylesheet
order, why it is load-bearing and fails silently, and a page for each framework.

## Working in this repository

### Prerequisites

| | | |
|---|---|---|
| **bun** | `>=1.1.0`, pinned at `1.1.43` | The package manager. Not npm, pnpm, or yarn |
| **Node** | `>=22.18` | Not bun's job, despite bun being the package manager. What carries a `#!/usr/bin/env node` shebang and is not run with `bun --bun` runs under whatever Node is on `PATH`: Next's `bin` in `build` and `dev`, and npm in the release. `cem analyze` is run with `--bun` for the reason [AGENTS.md](AGENTS.md#stack) gives |
| **Rust** | `>=1.96` | The Cortex crates, both CLIs, and the theme derivation engine |

### Setup

```bash
git clone https://github.com/project-fusion/fusion.git
cd fusion
bun install
bun run build
```

`bun install` runs `prepare`, which points `core.hooksPath` at `.githooks`. That
is the whole hook installation, and it is why there is no husky or lefthook.

`bun run build` runs `turbo run styles` and `bun run analyze` before compiling.
**`analyze` is the step a fresh clone cannot skip.** The custom elements
manifests are four files per tier and nine megabytes, so they are not committed,
and until they exist every rule that reads one says so rather than reporting a
clean tree it never looked at.

### Run the site

```bash
bun run dev
```

Next on its default port. The landing page is at `/`, the Helix documentation at
`/helix/docs`, the component gallery at `/helix/components`, and the sandbox and
theme builder at `/helix/sandbox` and `/helix/theme`.

The theme engine's browser build is tracked in `helix/theme/wasm`, so neither the
dev server nor CI builds it, and the site copies it under `public/` as a build
step. Rebuilding it after a change to the crate is `bun run gen:wasm`, which
wants:

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli
```

### Verify

```bash
bun run verify
```

Everything, and it must pass before anything is called done. **It never writes**:
`biome ci` rather than `biome check --write`, because a step that edits your
files cannot tell you whether they were correct. `fix` writes, `check` and
`verify` judge.

`verify` is CI's job rather than a local ritual, sharded over `plan`, `warm`,
`checks`, `lint`, `types`, `tests` and the `browser` matrix on every push. Locally,
`bun run check` is every guard and nothing else, and `check:<group>` is one
group: `cli`, `css`, `gen`, `prose` or `spec`. The groups sort by what a guard
reads, so the useful question after an edit is answered by a group name.

## Commands

| Command | Does |
|---|---|
| `bun run verify` | Everything. Must pass before anything is called done |
| `bun run check` | Every guard, and nothing else. `check:<group>` for one group |
| `bun run fix` | Fixes what it can: ordering, formatting, tokens, dialect |
| `bun run regen` | Every generated file, in the one order that works |
| `bun run build` | Compiles TypeScript. Runs `turbo run styles` and `analyze` first |
| `bun run analyze` | Writes the manifests and framework typings. Untracked, so a fresh clone needs it |
| `bun run dev` | The site, with its generators run first |
| `bun run test` | The specs. Partly Rust, since the theme package tests the crate. `bun run specs:browser` for the browser ones |
| `cargo test --workspace` | Rust |

Two CLIs carry the workspace rules, and both take `--json`:

```bash
bun run fusion --help    # workspace, prose and spec rules
bun run helix --help     # component conventions, theme derivation, an MCP server
```

## Where things are

Three product domains at the root, packages flat inside each. A new product gets
a new top-level folder. The folder drops the domain prefix and the package name
keeps it: `helix/styled` is `@fusion.dev/helix`, `cortex/core` is the crate
`fusion-cortex-core`. Scope a search by path rather than by folder name, since
bare leaf names recur across domains.

| | What it is | |
|---|---|---|
| **[Helix](helix/README.md)** | the design system | |
| | tokens and the base layer | [helix/styles](helix/styles/README.md) |
| | `HelixElement`, mixins, controllers | [helix/core](helix/core/README.md) |
| | structure, a11y, state, form participation | [helix/headless](helix/headless/README.md) |
| | the styled tier | [helix/styled](helix/styled/README.md) |
| | the icon set | [helix/icons](helix/icons/README.md) |
| | palette derivation | [helix/theme](helix/theme/README.md) |
| | the mistakes that are valid CSS | [helix/diagnostics](helix/diagnostics/README.md) |
| | the documentation, as content | [helix/docs](helix/docs/README.md) |
| | project templates | [helix/templates](helix/templates/README.md) |
| | `npm create @fusion.dev/helix-app` | [helix/create-app](helix/create-app/README.md) |
| | the editor and spec runner | [helix/sandbox](helix/sandbox/README.md) |
| | analyzer config, card art, spec helpers, the CLI | `cem` `gallery` `testing` `cli` |
| **[Cortex](cortex/README.md)** | memory, provenance, context | |
| | the substrate | `cortex/core` |
| | provenance capture | `cortex/trace` |
| | the memory store | `cortex/engram` |
| | the documentation, as content | [cortex/docs](cortex/docs/README.md) |
| **[Fusion](fusion/README.md)** | what belongs to the company | |
| | the published writing | `fusion/docs` |
| | the site that renders all of it | `fusion/site` |
| | the workspace CLI, what both CLIs share, and cross-cutting scripts | `fusion/cli` `fusion/rules` `fusion/scripts` |

Conventions, commands and the full layout are in [`AGENTS.md`](AGENTS.md).
Contributing is [`.github/CONTRIBUTING.md`](.github/CONTRIBUTING.md).

Not everything here publishes. `helix-cem`, `helix-gallery`, `helix-sandbox` and
`helix-testing` are build tooling for this repository, and the Cortex crates
wait on a consumer worth standing up a registry for.

Versions are **lockstep within a domain** and independent across domains, so
`@fusion.dev/helix-headless@x` works with `@fusion.dev/helix@x`. **The tag is
the record.** The release computes the number from the tag and stamps it into
the npm manifests seconds before packing; the Rust crates rest at `0.0.0-dev`,
because nothing stamps them.

## Contributing

1. **`bun run fix`** if anything is unformatted or out of order.
2. **`bun run regen`** if you changed a generator's source. CI cannot do this for
   you, and it is the one class of failure a push will not resolve on its own.
   Several generators read what an earlier one wrote, so `regen` is a
   hand-written order rather than an alphabetical one.
3. **`git push`.** The pre-push hook runs the withheld-name check, `biome ci`,
   `check:cli` and the generated-file checks, and nothing else: seconds against
   minutes. It judges
   and never writes, because a hook that edits the tree during `git push`
   produces a push that does not contain the edits. `git push --no-verify` skips
   it, and `verify.yml` does the rest.

**Regenerated files land in a commit of their own, and no source rides with
them.** They are written from the whole tree at once, so any of them may carry a
change somebody else made in the same checkout. A diff holding nothing but
generated output is one a reader can skip, and it makes a conflict in them
resolvable: take either side and run `regen` again.

**Where a fix lives.** Identify the source of the problem and fix it there. If
the symptom appears in one consumer but the cause is deeper, the fix still goes
deeper.

Three conventions come up on the first change, and
[`AGENTS.md`](AGENTS.md) carries the rest:

- **No em dashes** in code, docs, comments, or copy. Periods, colons, commas, or
  parentheses.
- **American spelling** everywhere, comments and prose alike. It is checked
  rather than asked for, because an unwritten convention is learned from the
  corpus. `bun run fix:dialect` rewrites; `fusion prose`'s `dialect` judges.
- **Alphabetize** object keys, interface members and exported types, except
  where order is semantic: positional arguments, middleware chains, CSS box-side
  shorthand, export conditions.

To add a component, [`AGENTS.md`](AGENTS.md) points at the
`add-component` skill, which covers both tiers, the tokens, the specs
and the manifest metadata together.

## License

MIT. See [`LICENSE`](LICENSE).
