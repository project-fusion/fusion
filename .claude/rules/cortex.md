---
paths:
  - "cortex/**"
---

# Cortex rules

Cortex is the cognitive substrate: Rust, local-first, storage-agnostic.

**Most AI systems are amnesiac and unaccountable. Cortex is neither.** Two
properties turn a model call into cognition: memory that consolidates and
forgets, and provenance that makes every output traceable. Provenance is the
spine, not a module.

## Modules

| Module | Crate | Owns |
|---|---|---|
| **Engram** | `fusion-cortex-engram` | Memory: episodic, semantic, later procedural |
| **Trace** | `fusion-cortex-trace` | Provenance: `why()`, replay, cascading deletion |
| **Recall** | `cortex-recall` | Context assembly. Not built |
| Core | `fusion-cortex-core` | Ids, provider abstraction, shared errors |

## Invariants

- **Local-first is the default, not the fallback.** An AI that remembers you but
  whose memory lives on someone else's server relocates the dependency rather
  than removing it. The hosted tier is convenience, never a chokepoint.
- **A local model provider is a thesis requirement, not a feature.** Cognitive
  sovereignty delivered solely through a remote API is not sovereignty. The
  `Provider` trait carries `is_local` so a product can tell the user whether
  their data left the device.
- **Ids are UUIDv7.** The timestamp prefix makes them sort in creation order,
  which turns index locality and time-range scans over episodic memory into a
  property of the key rather than a separate column.
- **Storage is not memory.** A table of everything that ever happened is the raw
  material memory operates on. Selection, consolidation, and forgetting are what
  make it memory.
- **Superseded facts are retained**, never overwritten. Provenance needs them to
  explain outputs produced while they were current.
- **Deletion cascades.** Removing a memory must remove everything derived from
  it, or "delete" is a promise the system cannot keep. Prune the reverse index
  too, or it grows across a session.
- **Two storage backends from the start**, SQLite and Postgres, held in lockstep
  by a shared conformance suite. An abstraction with one implementation is a
  guess, and SQLite assumptions leak into the domain model otherwise.
- **Vectors are deferred, the seam is not.** Memory records carry a nullable
  embedding field and relevance scoring is a strategy, so enabling them is
  swapping a scorer. `pgvector` is an extension, not a migration.

## Documentation

**Every Rust sample on a Cortex docs page lives in a `///` doc comment, and the
page cites it.** The pages carried eight fenced `rust` blocks that nothing
compiled, and the crates reported zero doc-tests, so a rename left the page
wrong with every check green. Now `cargo test --workspace --doc` runs them,
which also holds the behavioral claims (`trace.len() == 4`) that no signature
check could.

- Write the sample as a doc example on the item it documents. Hidden `#` lines
  carry the setup, so the sample compiles standalone and the page still shows
  only the lines that carry the idea.
- Cite it from the MDX with `[//]: # (rust:<crate>::<Type>::<method>)`, closed by
  `[//]: # (/rust)`. **The key is the name rustdoc prints**, so a failing
  doc-test names its own region.
- `bun run samples` fills the regions; `check:samples` fails when a page is
  behind its crate, and refuses a fenced `rust` block outside a region.

## Gotchas that produced bugs

- **`why()` is breadth-first.** A "why did it say that" answer that walks one
  arbitrary ancestor chain to its root before mentioning the sibling that
  mattered is the wrong shape. Use `VecDeque::pop_front`, not `Vec::pop`.
- **Walk to the head of a supersession chain.** Callers hold whichever fact id
  they read; pointing at an already-superseded fact forks the lineage and leaves
  two current facts where there should be one.
- **Clamp elapsed time at zero when decaying confidence.** A negative age raises
  confidence above anything recorded, manufacturing belief from clock skew.
