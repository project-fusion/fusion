# fusion-cli

The Fusion command line. Ships as the `fusion` binary.

```sh
fusion helix theme audit    # the Helix command line, routed
fusion locus test           # the Fusion Locus command line, routed
fusion x workspace check    # this repository's own checks
```

| Route | What it does |
|---|---|
| `helix` | Runs the `helix` binary with the rest of the line and returns its exit code |
| `locus` | Runs the `locus` binary the same way |
| `x` | Runs the checks this repository holds itself to. Only in this repository's builds |

Each product's command line works on its own, and `fusion` routes to it rather
than reimplementing it.

## `fusion x`, this repository's checks

The `internal` feature holds them. It is on by default, so every build in this
repository has `x`, and `binaries.yml` builds with `--no-default-features`, so a
published binary does not. In the `helix` binary the same feature holds Helix's
own component rules and `helix manifest build`: a published `helix component`
runs only the rules a project built on Helix's base classes can use. `x` is the
name the Rust compiler's own repository gives its internal tooling.

| Noun | What it holds | Rules |
|---|---|---|
| `workspace` | What a workspace says about itself | `barrels` `help` `icons` `modules` `node` `order` `prerequisites` `publishable` `reaching` `react-bridge` `registration` `scoped` `scripts` `shaders` `shipped` `strays` `warnings` |
| `prose` | The prose against what it describes | `art` `dashes` `dialect` `documented` `links` `notes` `orphans` `references` `repository` `tag-order` `voice` |
| `spec` | The specs against being specs | `hazards` `isolated` `matchers` `runners` |

`--only <rule>` runs one. Every group also carries `floors`, which is the rule
about the rules.

`--json` is on every verb: the rules, their counts and their findings, in a
shape a script can read without parsing sentences.

## Why the rules are here rather than in scripts

A rule returns a count that a meta-check can read. A script returns a sentence
somebody has to parse. `floors` is what that buys: it reads every rule's count
and fails when one of them is checking nothing, which is the failure a green
check cannot otherwise report. A rule that reads a manifest says so rather than
reporting a clean tree it never looked at, so a fresh clone wants `bun run
analyze` first, and `links`, which resolves against the site's route documents,
wants `turbo run catalog` as well. `check:prose` runs it.

The binary drops the suffix, per the naming rule: the crate is `fusion-cli` and
the command is `fusion`.

## Two shapes, one measurement

`audit` prints every rule and exits 1 on a finding. `check` runs the same
measurement and prints nothing on success. The difference is what is printed,
never what is judged.

## Exit codes

`helix`'s, read from the one crate both binaries take (`fusion/rules`), because
`fusion helix ...` hands its child's code back untouched: 0 clean, 1 a finding,
2 the command line does not parse, 3 the input is unusable (no workspace, a
`fusion.json` that is not JSON, a rule that does not exist), 4 the tool broke.
Errors go to stderr in both modes, as an object under `--json`, so stdout is an
answer or empty.

MIT
