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
| **Recall** | `fusion-cortex-recall` | Context assembly. Not built |
| Core | `fusion-cortex-core` | Ids, provider abstraction, shared errors |

## Invariants

- **Local-first is the default, not the fallback.** An AI that remembers you but
  whose memory lives on someone else's server relocates the dependency rather
  than removing it. The hosted tier is a convenience rather than a requirement.
- **A local model provider is a design requirement, not a feature.** Memory
  delivered solely through a remote API relocates the dependency instead of
  removing it. The `Provider` trait carries `is_local` so a product can tell the
  user whether their data left the device.
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
- **Two storage backends are required**, SQLite and Postgres, held in lockstep by
  a shared conformance suite. Neither is built: `Memory` and `Graph` are
  in-memory reference stores, and they are the shape the backends must match
  behind a trait. An abstraction with one implementation is a guess, and SQLite
  assumptions leak into the domain model otherwise.
- **A node's payload is typed, never a JSON blob.** `Detail` is what makes a
  trace executable rather than merely readable: a replay reconstitutes the call
  that produced a node, and `serde_json::Value` cannot promise the fields it
  needs exist or are spelled the way last release spelled them. `NodeKind` is
  derived from `Detail` rather than stored beside it, so the two cannot
  disagree. `ToolCall`'s arguments stay untyped and that is the one place it is
  correct, because tool arguments are arbitrary JSON by the wire format's
  definition.
- **A replay never executes tool calls.** Re-running a tool re-performs its
  side effects, so a replay of a trace that sent an email would send it again.
  Tool replay needs a sandbox and an explicit opt-in; until it has both, the
  runner carries `ToolCall` nodes forward untouched, and a test asserts the call
  count rather than inferring it from the diff.
- **A replay holds context fixed, and that is the experiment.** Recomputing
  retrieval alongside the model confounds the two variables, and the answer to
  "did this move because the model changed" stops being available. Varying
  retrieval is a different run, and it needs Recall.
- **A scorer reports a pinned, versioned id, and every result records it.**
  Judging model output with a model is circular: an instrument that drifts
  between runs cannot tell you which of the two things moved. This is what the
  local provider requirement buys, beyond privacy: a hosted model can be
  updated behind a stable name, which is precisely the phenomenon a drift
  measurement exists to detect.
- **Vectors are deferred, the seam is not.** A memory record must carry a
  nullable embedding field and relevance scoring must be a strategy, so enabling
  vectors is swapping a scorer rather than migrating a schema. Neither exists
  yet: `Fact` carries no embedding field today. `pgvector` is an extension, not a
  migration.

## Documentation

**Every Rust sample on a Cortex docs page lives in a `///` doc comment, and the
page cites it.** A fenced `rust` block typed into MDX is compiled by nothing, so
a rename leaves the page describing the old signature with every check green. In
a doc comment `cargo test --workspace --doc` runs it, which also holds the
behavioral claims (`trace.len() == 4`) that no signature check could.

- Write the sample as a doc example on the item it documents. Hidden `#` lines
  carry the setup, so the sample compiles standalone and the page still shows
  only the lines that carry the idea.
- Cite it from the MDX with `[//]: # (rust:<crate>::<Type>::<method>)`, closed by
  `[//]: # (/rust)`. **The key is the name rustdoc prints**, so a failing
  doc-test names its own region.
- `turbo run samples` fills the regions; `turbo run samples -- --check` fails when a page is
  behind its crate, and refuses a fenced `rust` block outside a region.

## Gotchas that produced bugs

- **`why()` is breadth-first.** A "why did it say that" answer that walks one
  arbitrary ancestor chain to its root before mentioning the sibling that
  mattered is the wrong shape. Use `VecDeque::pop_front`, not `Vec::pop`.
- **`why()` is a reading order and `plan()` is an execution order.** Never
  execute a replay in `why()` reversed. Breadth-first from the output is
  reachability, not dependency, and reversing it holds only while every node
  sits at exactly one depth, which a chain and a plain diamond both satisfy, so
  either one as a test passes against the wrong implementation. It breaks when a
  node is reachable at two depths: breadth-first pins it at the shallowest, and
  execution needs it before the deepest thing that reads it. The result is a
  recomputation against an input that does not exist yet, and it still looks
  like an answer.
- **Walk to the head of a supersession chain.** Callers hold whichever fact id
  they read; pointing at an already-superseded fact forks the lineage and leaves
  two current facts where there should be one.
- **Clamp elapsed time at zero when decaying confidence.** A negative age raises
  confidence above anything recorded, manufacturing belief from clock skew.
