# fusion-plugins

The host that runs a rule somebody wrote outside this repository.

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

## Writing one

[`example/`](example) is a whole plugin, in about a hundred lines. It is built
for `wasm32-unknown-unknown` and encoded into a component:

```sh
cargo build --release --target wasm32-unknown-unknown
wasm-tools component new target/wasm32-unknown-unknown/release/my_plugin.wasm -o my-plugin.wasm
```

Drop the component into `.helix/plugins` in the workspace it should run over.
`helix component check` walks that directory, prints what it loaded by name and
digest, and runs each rule the modules provide beside its own.

## What a plugin may do

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

## What a plugin is held to

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
