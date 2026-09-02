# cortex/

**Cortex**, a memory and provenance substrate.

Packages are flat inside this folder, one directory each, the same arrangement
`helix/` uses.

| Package | Publishes as | What it is |
|---|---|---|
| `core` | none | the substrate itself |
| `docs` | `cortex-docs` | the documentation as content, versioned with Cortex |
| `engram` | none | the memory store |
| `trace` | none | provenance capture |

Only `docs` publishes today, and the release stamps its number into the manifest.
The crates are not on the registry yet and rest at `0.0.0-dev`, because nothing
stamps them.

**Versioning is per domain, not per repository.** `cortex-v*` tags allocate
Cortex's versions and `helix-v*` allocate Helix's, so a release of either does
not wait on the other. That is why a documentation package carries the version of
the thing it documents.

Conventions for this folder are in `.claude/rules/cortex.md`, and it loads
automatically for work under `cortex/**`.
