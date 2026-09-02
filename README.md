<div align="center">
  <img src=".github/fusion-logo.svg" width="88" alt="Fusion" />
  <h1>Fusion Development Group</h1>
</div>

<div align="center">
  <strong>Helix</strong>, a design system of web components that derives its own
  accessible palette, and <strong>Cortex</strong>, a memory and provenance
  substrate.
  <br />
  <a href="https://helix.fusion.dev">Documentation</a> ·
  <a href="https://helix.fusion.dev/components">Components</a> ·
  <a href="https://helix.fusion.dev/theme">Theme builder</a> ·
  <a href="https://fusion.dev">fusion.dev</a>
</div>

<div align="center">
  <a href="https://github.com/project-fusion/fusion/actions/workflows/verify.yml">
    <img
      src="https://github.com/project-fusion/fusion/actions/workflows/verify.yml/badge.svg?branch=main"
      alt="verify workflow status on main"
    />
  </a>
  <a href="https://github.com/project-fusion/fusion/actions/workflows/release.yml">
    <img
      src="https://github.com/project-fusion/fusion/actions/workflows/release.yml/badge.svg?branch=main"
      alt="release workflow status on main"
    />
  </a>
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

[Installation](https://helix.fusion.dev/docs/installation) has the stylesheet
order, why it is load-bearing and fails silently, and a page for each framework.

## Working in this repository

### Prerequisites

| | | |
|---|---|---|
| **bun** | `>=1.1.0`, pinned at `1.1.43` | The package manager. Not npm, pnpm, or yarn |
| **Node** | `>=22.18` | Not bun's job, despite bun being the package manager. `cem` carries `#!/usr/bin/env node`, so the shebang hands it to whatever Node is on `PATH` and bun's own TypeScript support never applies. Its config is a `.ts` file, and native type stripping starts at 22.18: below the floor it loads a default config instead, writes a manifest with every Helix plugin missing, and reports success |
| **Rust** | `>=1.90` | The Cortex crates, both CLIs, and the theme derivation engine |

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

The dev script rebuilds the theme wasm before starting, so a local dev server
also wants:

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli
```

CI needs neither. The built artifact is committed and read as an input, which is
what keeps a wasm toolchain off every job.

### Verify

```bash
bun run verify
```

Everything, and it must pass before anything is called done. **It never writes**:
`biome ci` rather than `biome check --write`, because a step that edits your
files cannot tell you whether they were correct. `fix` writes, `check` and
`verify` judge.

`verify` is CI's job rather than a local ritual, sharded over `plan`, `warm`,
`checks`, `lint`, `types`, `tests` and six `browser` jobs on every push. Locally,
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
| `bun run dev` | The site. Rebuilds the theme wasm first |
| `bun run test` | The specs. Partly Rust, since the theme package tests the crate. `bun run specs:browser` for the browser ones |
| `cargo test --workspace` | Rust |

Two CLIs carry the workspace rules, and both take `--json`:

```bash
bun run fusion --help    # workspace, prose and spec rules
bun run helix --help     # component conventions, theme derivation, an MCP server
```

## Layout

```
helix/     styles core headless styled icons theme cem docs diagnostics
           gallery sandbox testing cli
cortex/    core trace engram docs
fusion/    cli docs scripts site
```

- **Product domains at root, packages flat inside.** A new product gets a new
  top-level folder.
- **The folder drops the domain prefix and the package name keeps it.**
  `helix/styled` is `@fusion.dev/helix`; `cortex/core` is the crate
  `fusion-cortex-core`. Scope a search by path rather than by folder name, since
  bare leaf names recur across domains.
- **`<domain>/docs` is a content package, not a site.** Versioned MDX plus a
  typed registry. The site that renders it is separate and depends on it.
- **`fusion/` is the company tier**, and a domain like the other two: the CLI,
  the writing, and the site that renders everything above it.

Not everything here publishes. `helix-cem`, `helix-gallery`, `helix-sandbox` and
`helix-testing` are build tooling for this repository, and the Cortex crates
wait on a consumer worth standing up a registry for.

Versions are **lockstep within a domain** and independent across domains, so
`@fusion.dev/helix-headless@x` works with `@fusion.dev/helix@x`. **The version
lives in the tag rather than the manifest**: every manifest holds `0.0.0-dev`
and the release stamps the real number in CI seconds before packing.

## Contributing

1. **`bun run fix`** if anything is unformatted or out of order.
2. **`bun run regen`** if you changed a generator's source. CI cannot do this for
   you, and it is the one class of failure a push will not resolve on its own.
   Several generators read what an earlier one wrote, so `regen` is a
   hand-written order rather than an alphabetical one.
3. **`git push`.** The pre-push hook runs `biome ci`, `check:cli` and the
   generated-file checks, and nothing else: seconds against minutes. It judges
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
`adding-helix-components` skill, which covers both tiers, the tokens, the specs
and the manifest metadata together.

## License

MIT. See [`LICENSE`](LICENSE).
