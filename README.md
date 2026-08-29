<div align="center">
  <img src=".github/fusion-logo.svg" width="88" alt="Fusion" />
  <h1>Fusion Development Group</h1>
</div>

**Fusion Development Group, LLC.** Developing for humanity.

Two inputs are collapsing in cost at the same moment: machine intelligence and
solar energy. That is not primarily a productivity story. It is a **sovereignty**
story, because the two things that historically forced people and nations to depend
on larger institutions were the cost of thinking at scale and the cost of power.

Fusion builds the stack that makes sovereignty practical, starting with the
individual and scaling up.

---

## The Sovereignty Constraint

> No Fusion product may create a dependency that its user cannot exit.
>
> The user holds their own keys, data, and hardware. Fusion may operate a control
> plane, never a chokepoint. Every product must keep working if Fusion disappears.

Applied as a test to anything proposed: *what happens to the user if Fusion shuts
down tomorrow?* If the answer is "they lose the thing," it isn't a Fusion product.

## Verticals

| Vertical | Product | Stage |
|---|---|---|
| **Fusion Studio** | services | Active |
| **Fusion Design** | Helix | Building |
| **Fusion Mind** | Cortex | Building |
| **Fusion Energy** | TBD | Declared |
| **Fusion Capital** | none | Declared |
| **Fusion Defense** | none | Declared |
| **Fusion Civic** | none | Declared |
| **Fusion Living** | none | Declared |

**Active** ships with users. **Building** is real work, nothing shipped.
**Declared** is a committed direction with no work started. These labels are honest
on purpose and are not softened as the company matures.

## Documents

`fusion/docs/insights/` is the published essays, `fusion/docs/19-queue.md` is the
work queue, and the two generated references beside them are
`component-reference.md` and `token-reference.md`.

## Packages

| Domain | Packages |
|---|---|
| **Helix** (`@fusion.dev/helix-*`) | `styles` `core` `headless` `web` `react` `icons` `theme` `cem` `docs` |
| **Cortex** (crates, `@fusion.dev/cortex-*`) | `fusion-cortex-core` `fusion-cortex-trace` `fusion-cortex-engram` `docs` |

Versions are **lockstep within a domain**, independent across domains. See
[`AGENTS.md`](AGENTS.md).

## Stack

Rust for the backend and substrate cores. TypeScript for the frontend.
Cargo workspace for Rust, bun and Turborepo for TypeScript, Biome for both
linting and formatting.

```bash
bun install && bun run verify
```

## Conventions

- `.local/` is gitignored and per-machine. Scratch, artifacts, screenshots.
- `fusion/docs/` is tracked. Strategy lives with the code.
- **No em dashes** in code, docs, or copy.
