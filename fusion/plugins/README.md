# Fusion Plugin Host

Fusion Plugin Host runs WebAssembly components that somebody wrote outside the
product that runs them. It has one loader and a crate for each world a
component can be built against.

| Crate | What it holds |
|---|---|
| [`fusion-plugin-host`](host) | The loader: it reads a component, pins it by its SHA-256 digest, and starts each call in a fresh store under fuel, a deadline, and a memory cap. With the `net` feature, the address guard |
| [`fusion-plugin-rules`](rules) | The `fusion:rules` world, which judges a payload |
| [`fusion-plugin-tools`](tools) | The `fusion:tools` world, which offers tools to a model |
| [`fusion-plugin-sources`](sources) | The `fusion:sources` world, which reads items since a cursor, and its conformance suite |
| [`fusion-plugin-tracker`](tracker) | The `fusion:tracker` world, which writes back to the service that holds the items, a reference tracker, and its conformance suite |

The WIT for every world is in [`wit/`](wit). The loader depends on no world,
and a world's crate depends on the loader alone. A product embeds the crates
for the worlds it hosts, and passes in what is its own to decide, such as the
publishers it keeps for its own plugins and the prefix of the names a model
sees for plugin tools.

## Rules

A plugin is a WebAssembly component built against the `fusion:rules` world in
[`wit/rules.wit`](wit/rules.wit). It exports three functions: the version of the
world it speaks, the rules it provides, and one that judges a payload. The
payload and the judgment are JSON strings: the byte protocol, declared in a
schema, so widening the world into typed records later is a change rather than a
rewrite.

Each rule says what it reads. The host composes those parts of the payload and
no others, so a rule about stylesheets is handed no manifests: `helix component`
has `manifests` and `sheets`, and a part a rule did not ask for is absent rather
than empty.

### Writing one

[`example/`](example) is a whole plugin, in about a hundred lines. It is built
for `wasm32-unknown-unknown` and encoded into a component:

```sh
cargo build --release --target wasm32-unknown-unknown
wasm-tools component new target/wasm32-unknown-unknown/release/my_plugin.wasm -o my-plugin.wasm
```

Drop the component into the plugin directory of the noun it is for:
`.helix/plugins` for `helix component`, `.fusion/plugins/prose` or
`.fusion/plugins/spec` for those. Each walks its own directory, prints what it
loaded by name and digest, and runs the rules the modules provide beside its
own.

What a noun composes is what its rules read. `helix component` has `manifests`
and `sheets`; `fusion x prose` has `documents`; `fusion x spec` has `specs`. One
module may provide rules for several nouns: each run takes the ones whose parts
it composes, names the others in the register so a rule that is not running is
visible, and refuses a module with nothing for it at all.

### What a plugin may do

Read the payload and say what it would write. That is all: nothing is imported
into a module, so there is no filesystem, no clock and no network, and a module
asking for one is refused by name when it loads.

A rule that can repair something returns the whole new text of each file it
would rewrite, beside its findings. `check` reports them and writes nothing;
`fix` applies them, which is the same split every rule compiled in has. The host
writes the files, never the plugin, and an edit naming an absolute path, a path
that climbs out of the workspace or one that resolves outside it through a link
is refused: a module kept off the filesystem that could name any path on it
would be a sandbox with a door in the back.

A plugin needing something the payload does not carry is a request to widen the
world, reviewed once, rather than an escape hatch nobody can audit.

### What a plugin is held to

- **The world it speaks.** A module built against a world this host does not
  speak is refused by name, with both numbers and what to do about it.
- **Answering.** A plugin that traps, or hands back something that is not a
  judgment, is a finding against the plugin: it counted nothing, so nothing it
  was going to check is being checked, and a run that quietly skipped it would be
  a check that stopped checking without saying so.
- **Being visible.** The register prints every module and its digest on every
  run, and in `--json`, so a plugin cannot arrive without anybody noticing.
- **Naming a rule nothing else claims.** Two modules providing one rule name are
  refused with both named: last one wins would make which rule ran depend on how
  the directory sorts.

## Tools

A tool is a WebAssembly component built against the `fusion:tools` world in
[`wit/tools.wit`](wit/tools.wit), which a host application runs for an extension. It
exports the version of the world it speaks, the tools it provides, each with
its input's JSON Schema, and one function that runs a call. The input is the
model's JSON, and the answer is text.

A tool may do more than a rule, so it is lent three host functions: read a
file, fetch a URL, and read an environment variable. Each call to one is
checked against the grant the person gave, and fails with a sentence where the
grant does not cover it:

| Function | The grant names | Checked against |
|---|---|---|
| `read-file` | Folders | The path, resolved through every link |
| `fetch` | Hosts, each with its subdomains | The URL's host. A URL that carries a user name is refused |
| `secret` | Variables | The name |

An empty grant reaches nothing. The host carries no HTTP client: the embedder
sends the request, follows no redirect to a host the grant does not name, and
connects to no address on this machine or a private network the grant does not
name. The embedder resolves each name once and connects to the address it
checked.

Every call runs in a store of its own under these limits:

- fuel, about one unit for each instruction;
- a deadline of 30 seconds, which a fetch counts against too, since the
  embedder is handed the time the call has left;
- a memory cap;
- 16 fetches;
- 8 MiB brought back by all of its fetches together.

A call that reaches one stops, and its error names the limit.
[`tool-example/`](tool-example) is a whole tool module, built the same way as
the rule example.

## The Fusion Work Protocol

The Fusion Work Protocol is the set of open contracts an agent uses to take
items of work from a tracker and report on them. It has two WIT packages:

- [`fusion:sources`](wit/sources/sources.wit) reads items. Its `reader` world
  exports `spec`, `check`, `discover`, `list` since a cursor, and `get`.
- [`fusion:tracker`](wit/tracker/tracker.wit) writes back. Its `writer` world
  includes the `reader` world and adds `claim`, `update` with a version,
  `link`, and `create`, which a tracker may decline.

Each item comes back with its id, its address, its version, its author, and
whether the author can write to what the binding targets. Every piece of text a
person wrote in the service is an `untrusted` record, in the WIT and in Rust,
so a host reads it as data and never as instructions.

The host holds every lease in its own store, with a holder, an expiry, and a
claim number that rises with each claim. A tracker only shows the claim, as an
assignee or a label, since most services cannot claim an item atomically. The
host also decides each item's status, and every word a tracker writes comes
from the host's templates.

A component is lent its binding's settings, as JSON matching the schema `spec`
returns, and nothing else. A component importing anything more is refused by
name when it loads.

### An open protocol

The Fusion Work Protocol is for every agent, model, and tracker. Six rules keep
it that way, and every change to its WIT, its crates, or its conformance suites
follows them:

- **The spec is open.** The WIT is MIT licensed, and you can implement it
  without Fusion.
- **The conformance suite is public.** Anyone can run it against their own
  implementation.
- **No Fusion-only extension is required.** An implementation that passes the
  suite conforms, with nothing added.
- **It works with any model and any vendor.** Nothing in the protocol names or
  assumes one.
- **Outside implementations are welcome.** Each one that passes the suite is
  the proof that the protocol is open.
- **Fusion appears only in the package ids.** `fusion:sources` and
  `fusion:tracker` are the only places the protocol names Fusion, so it can
  move to a neutral name or a foundation later without breaking an
  implementation.

### Built in or loaded

`Source` and `Tracker` are the worlds' exports as Rust traits. A product
implements them in Rust for a tracker it builds in, and `Component` in each
crate implements them for a component loaded from a file. `Memory` is the
reference tracker: every call of the world, over items held in memory.

### Conformance

Each world's crate has a `conformance` module that any implementation runs
against a binding made for it. You hand it the ids of items the binding holds
and one it does not, and it returns a report that names each check:

```rust
use fusion_plugin_sources::conformance::Fixture;
use fusion_plugin_tracker::conformance;

let report = conformance::run(&tracker, &Fixture {
    known: vec!["1".to_owned()],
    missing: "no-such-item".to_owned(),
});
report.assert_passed();
```

The tracker suite runs the sources suite first. It then checks the four calls
against what `check` says the binding allows. Where the binding can write back,
`update` returns a new version, a stale version is refused where the tracker
checks versions, `claim` shows and clears a holder, and `link` attaches an
address once. Where it cannot, every write is denied and the item does not
change. The suite writes, so run it against a binding you made for it.

### Writing a tracker

[`tracker-example/`](tracker-example) is a whole tracker. Its items are its
binding's settings, so it lists and reads them and declines every write, as a
tracker bound with a read-only credential does. It is built the same way as
the rule example:

```sh
cargo build --release --target wasm32-unknown-unknown
wasm-tools component new target/wasm32-unknown-unknown/release/my_tracker.wasm -o my-tracker.wasm
```

A tracker whose service checks no versions passes the suite too, since each check
follows what `check` reports. The tests run the suite against the reference
tracker, against the example as a tracker and as a source, and against a
tracker that breaks the contract, which fails the checks it breaks.
