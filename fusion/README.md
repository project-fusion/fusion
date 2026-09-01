# fusion/

What belongs to the company rather than to a product.

| Package | What it is |
|---|---|
| `site` | the public site and the documentation surface it renders |
| `docs` | company strategy, plus two generated references. `docs/insights` is the published writing |
| `cli` | `fusion`, the Rust command line: `prose`, `spec`, `workspace`, and `helix` which delegates |
| `scripts` | what is genuinely cross-cutting and cannot be a rule |

Nothing here publishes to npm.

**A check belongs to a CLI noun; a script belongs where its output belongs.**
Everything that judges the workspace is a rule under `fusion workspace`,
`fusion prose`, `fusion spec` or `helix component`, reached from the root by one
delegating script apiece. Everything that *writes* something lives in the package
that owns what it writes, so `helix/docs` builds the docs and `helix/styles`
builds the token layer.

**What is left over is `scripts`, and it is small on purpose.** A script goes
there when it is cross-cutting and cannot be a rule: the ones that drive a
browser, the ones that build and run the eval corpus, and the meta-check that
floors the generators. Anything that could be a rule should be one, because a
rule returns a count that `floors` can read and a script returns a sentence
somebody has to parse.

**Flat is runnable and `lib/` is importable.** Every flat file is invoked by a
script, a workflow, `turbo.json` or the hook, and nothing invokes anything in
`lib/`, so `ls fusion/scripts` answers "what can I run".
