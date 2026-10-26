# Cortex rules

Cortex is the cognitive substrate: Rust, local-first, storage-agnostic.

**Most AI systems are amnesiac and unaccountable. Cortex is neither.** Two
properties turn a model call into cognition: memory that consolidates and
forgets, and provenance that makes every output traceable. Provenance is the
spine, not a module.

## Modules

| Module | Crate | Owns |
|---|---|---|
| **Engram** | `fusion-cortex-engram` | Memory: episodic, semantic, consolidation, and scopes; later procedural |
| **Trace** | `fusion-cortex-trace` | Provenance: `why()`, replay, cascading deletion |
| **Recall** | `fusion-cortex-recall` | Context assembly: pins, compaction, drop records |
| Core | `fusion-cortex-core` | Ids, the provider and embedder abstractions, shared errors, storage locations, and the Postgres connection and migrations the stores share |
| Providers | `fusion-cortex-provider` | Model clients, one per API and each a feature, local first |
| Extraction | `fusion-cortex-extract` | Typed extraction: a reply checked against a schema, one retry, and its trace |

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
- **A fact goes with its last source.** Engram's `derived_from` is a fact's
  support: forgetting an episode removes the edge, in the store's `sources`
  rows as well, and removes a fact only when no source is left. A fact another
  episode still supports stays. Trace's cascade is by derivation and goes
  further: deleting an episode's node removes every node computed after it,
  so a consolidation pass's extraction goes with any episode it read.
- **Every episode and fact carries a scope**: personal, project, team, or
  organization, with the project or team it names. An episode takes its scope
  when it is recorded. A fact takes the narrowest scope of its sources by
  `Scope::narrowest`: personal wins, the organization yields, and two
  different projects or teams, or a project and a team, make it personal,
  because Cortex does not know how they nest. Adding a source can narrow a
  fact's scope, and forgetting one never widens it. Recall's `relevant` takes
  the scopes a caller may read and places nothing outside them, and a scope
  matches only itself.
- **Consolidation reads each scope apart.** The pass batches a scope's
  episodes and shows the model only that scope's current facts, so a fact never
  rests on an episode some of its readers may not read.
- **Two storage backends are required**, SQLite and Postgres, held in lockstep by
  a shared conformance suite. Trace has its trait, `store::Store`, with
  `InMemory` as the reference and `Sqlite` and `Postgres` beside it, all run
  through `store::conformance`. Engram has the same shape: its `store::Store`,
  with `InMemory` holding the reference `Memory`, and `Sqlite` and `Postgres`,
  all run through its own `store::conformance`. An abstraction with one
  implementation is a guess, and SQLite assumptions leak into the domain model
  otherwise. Each backend is a feature, `sqlite` and `postgres`, and both are
  default so `cargo clippy` and `cargo test` build them.
- **A connection string picks the backend.** `store::open` in each crate reads
  it with `fusion_cortex_core::storage::Location`: `sqlite:` or a path is
  SQLite, and `postgres://` is Postgres. A hosted Postgres is a URL like any
  other, and no store names a vendor. The one exception is port 6543, where
  Supabase's transaction pooler listens, which turns prepared statements off as
  `pooler=transaction` does. An error never repeats the string, which can hold
  a password.
- **The Postgres suites run when `CORTEX_POSTGRES_URL` names a database.**
  `fusion_cortex_core::postgres::in_scratch_schema` gives each run a schema of
  its own and drops it after, even when the suite panics. Without the variable
  the Postgres tests pass without running and print a note, so
  `cargo test --workspace` needs no database.
- **A Postgres schema is a list of steps, recorded and idempotent.**
  `Database::migrate` runs the steps past the version `cortex_migrations`
  records for the store, in one transaction under an advisory lock, and each
  step's DDL says `IF NOT EXISTS`. A released step is never edited, and a
  change to the schema is a new step at the end. SQLite keeps its own path:
  Trace's search index is versioned in `user_version`, and Engram's columns are
  added by `pragma_table_info`, because both stores may share one file.
- **Behind a transaction-mode pooler, every statement is unnamed and inside a
  transaction.** A pooler gives each transaction any free server connection,
  so a statement prepared by name on one is missing on the next. A Postgres
  store builds each statement with `Database::query` or `Database::scalar`,
  which prepare it by name only when `Database::prepared` says so, and runs it
  in a transaction, reads included. A write that reads first takes an advisory
  lock, as SQLite's `BEGIN IMMEDIATE` takes the write lock.
- **The search suite holds which entries match, and each backend ranks.**
  Every backend finds a word as characters anywhere, in any case: SQLite with
  FTS5 trigrams, and Postgres with a `tsvector` whose lexemes are trigrams Rust
  folds, under a GIN index, and a substring check of the folded text. Postgres's
  stemmed text search would miss a word inside an identifier, which is why the
  lexemes are trigrams. The order of traces is each backend's measure,
  `bm25` or `ts_rank`; `search::conformance::ranking` holds the reference's
  order, and a backend whose measure keeps it runs that beside the suite.
- **A trace is appended to and never edited.** A node is written once, which is
  what lets a trace serve as an agent session's event log: a restarted loop loads
  the trace and continues from its last node.
- **A node's payload is typed, never a JSON blob.** `Detail` is what makes a
  trace executable rather than merely readable: a replay reconstitutes the call
  that produced a node, and `serde_json::Value` cannot promise the fields it
  needs exist or are spelled the way last release spelled them. `NodeKind` is
  derived from `Detail` rather than stored beside it, so the two cannot
  disagree. `ToolCall`'s arguments stay untyped, because tool arguments are
  arbitrary JSON by the wire format's definition, and so does `Extraction`'s
  value, whose shape is the caller's schema. Those are the two places it is
  correct, and every field around them is typed.
- **A replay never executes tool calls.** Re-running a tool re-performs its
  side effects, so a replay of a trace that sent an email would send it again.
  Tool replay needs a sandbox and an explicit opt-in; until it has both, the
  runner carries `ToolCall` nodes forward untouched, and a test asserts the call
  count rather than inferring it from the diff.
- **A pinned part is never dropped.** Recall clears old tool results, then
  drops old turns, then facts, and never the rules, the task, or what the
  person said. Every clear and drop is a `Dropped` on the context node, with
  the node it came from, so a compaction is an explained step and never a
  silent loss.
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
- **A vector names its model, and two models are never compared.** A fact's
  `embedding` is an `embed::Embedding`: the values and the `Embedder::model`
  that made them, which includes the length where the caller set one
  (`gemini/gemini-embedding-001@768`). `Embedding::cosine` returns `None` unless
  the model and the length agree, every store's `nearest` reads only the
  query's model at its length, and Recall's `Vector` scores another model's
  fact zero. A change of model is `embed::backfill`, never a comparison of old
  vectors with new ones. A stored vector with no model reads as no embedding.
- **A store refuses a vector that cannot be compared**: empty, holding a value
  that is not finite, or all zeros. `pgvector` refuses the same ones, so every
  backend refuses them in Rust first, and `Embedding::check` is the one test.
- **Embedders are local first, as providers are.** `Embedder` carries
  `is_local`, `ollama::Embeddings` is the default client, and Anthropic and the
  Responses API have no embedder because neither API embeds text.
- **Consolidation never drops a fact for its vector.** A failed embedding call
  leaves the batch's facts without one, named in `Consolidation::unembedded`,
  for `backfill`.
- **Scoring is a strategy, and a combination records its parts.** Recall's
  `Scorer` is the strategy, with `Overlap`, `Vector`, and `Weighted`. A
  scorer's `id` names the model it reads, a `Weighted` id names each part and
  weight, and `explain` is what a context records as the reason a fact was
  placed.
- **`pgvector` where the database has it, Rust where it does not, chosen at
  open.** `SQLite` keeps the vector as bytes and ranks in Rust with no
  extension. Postgres keeps `real[]` in every schema. Where the `vector`
  extension is installed, or the role may create it, `Postgres::over` adds
  `embedding_vector`, a stored column generated from `real[]`, and `nearest`
  orders by `<=>`. Otherwise it ranks in Rust as `SQLite` does. The column is
  the record: a schema that has it stays on `pgvector`, and one without it
  tries again at the next open. The column is no migration step, because it
  exists only where the server has the extension; the model's column is step 2.
- **One HNSW index per model and length, partial, written with literals.** An
  HNSW index needs a fixed length, so each model gets
  `facts_embedding_<hash>`, over `embedding_vector::vector(n)` where the model
  and `vector_dims` match. The query writes the model and the length into its
  text, because a partial index matches only a predicate the planner can see,
  and quotes them with `identifier` and `literal`. A model longer than 2,000
  values has no index and is scanned. The pgvector suite checks the plan uses
  the index.

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
- **Mark what a pass read.** An episode no fact rests on is pending until a
  pass marks it consolidated. Deleting a fact marks its sources too, or the
  next pass distills the deleted fact again from the same episodes.
- **Postgres text refuses the NUL character, and `jsonb` refuses `\u0000`.**
  Trace keeps a node's detail as JSON text, which escapes it, and indexes a NUL
  as a space. Engram's text columns refuse one, which the storage guide says.
- **Postgres has no `min()` for `uuid`.** Read a trace's first node with
  `DISTINCT ON (trace) … ORDER BY trace, id`.
- **Migrate a `SQLite` file on one connection, then open the pool.** A pool
  connection opened before a column was added prepares `SELECT *` with the old
  columns, `SQLite` prepares it again with the new ones when it runs, and
  `sqlx` indexes past its cached list and panics in its worker.
- **Install `pgvector` outside the scratch schemas in a test.** A store that
  creates the extension puts it in the first schema of its search path, so the
  suite's scratch schema would hold it, and dropping that schema would drop
  every other schema's vector column. Engram's Postgres tests install it in the
  database's default schema first.
- **Clamp elapsed time at zero when decaying confidence.** A negative age raises
  confidence above anything recorded, manufacturing belief from clock skew.
