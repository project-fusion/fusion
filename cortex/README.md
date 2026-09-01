# cortex/

**Cortex**, a memory and provenance substrate.

Packages are flat inside this folder, one directory each, the same arrangement
`helix/` uses.

| Package | Publishes as | What it is |
|---|---|---|
| `core` | — | the substrate itself |
| `trace` | — | provenance capture |
| `engram` | — | the memory store |
| `docs` | `cortex-docs` | the documentation as content, versioned with Cortex |

Only `docs` publishes today, and it is at `0.0.0-dev`: the domain has taken no
release, so the rest of this folder is not yet on the registry.

**Versioning is per domain, not per repository.** `cortex-v*` tags allocate
Cortex's versions and `helix-v*` allocate Helix's, so a release of either does
not wait on the other. That is why a documentation package carries the version of
the thing it documents.

Conventions for this folder are in `.claude/rules/cortex.md`, and it loads
automatically for work under `cortex/**`.
