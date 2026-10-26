# How CI is split

**No Node on the runner.** `helix-cem` runs under `bun --bun` and the
repository's own scripts run under bun directly, both measured rather than
assumed: the manifests came back byte for byte identical, and every
`fusion/scripts/*.mjs` runs. Only the release workflows install Node, and that
is for npm, which is a Node program.

`verify.yml` implements this; the reasoning is here so a contributor reads it
once rather than in thirty-nine comment blocks.

## The list of checks is never written twice

`run-checks.mjs` reads the `verify` script and shards it, so adding a check to
`verify` puts it in CI with no second edit, and a step that is neither a check
nor one of the dedicated jobs fails the run rather than being skipped. A matrix
written out in the workflow would be a second definition of correct, drifting the
first time somebody edited one of them.

**The point of the split is reporting, not speed.** `verify` is `a && b && c`, so
it stops at the first failure; a shard runs every check it owns and reports them
together.

**A shard floors what it runs.** Each check runs command by command, and a
command's success line with a zero in it fails the shard: a check that passed
while counting nothing. The `floors` job keeps the structural half, a walk of
`check` that reaches nothing and an exemption that matches nothing, and runs
only what `check` reaches and no shard runs. It used to run every check a second
time to read the same lines, and it was the last job to finish.

`verify` never writes: `biome ci` rather than `biome check --write`, and every
shard ends by asserting the tree is unchanged.

## Which jobs a diff can possibly fail

The browser matrix is a set of jobs that each want a build, a browser and
minutes, and a change to the writing under `fusion/docs/` cannot move a pixel in
any of them.
`.github/scripts/touched.sh` decides.

**An allowlist of what is skippable, not a denylist of what is not.** The set is
the paths that reach no component and no page: `fusion/docs/` is the
repository's own writing, a `.md` anywhere is a document no browser job reads, `cortex/` is Rust and MDX with nothing rendered, `.claude/` is tooling
for the agent. Everything else runs the browser jobs, `tooling/` included,
because `build-frame.mjs` and `build-styles.mjs` live there and both are read by
every example. A path nobody thought about lands outside the list and runs, which
is the direction this has to fail in.

**An unresolvable base assumes everything.** A force push leaves
`github.event.before` naming a commit the checkout does not have, and a first
push to a branch names all zeroes.

**Counted rather than tested with `grep -qv`, because that answer is not
portable.** The obvious spelling is one `grep -qvE` asking whether any changed
file falls outside the list. GNU grep, which is what a runner has, answers
correctly. `ugrep`, a drop-in replacement common enough to be on a contributor's
`PATH`, exits 1 on the same input where it exits 0 without `-q`, so the condition
inverts and the browser jobs are skipped for a change to `helix/styled`. Comparing
two counts asks nothing of `-v` and means the same thing to every grep.

## The typings run where they can change

`typings` runs `smoke:typings`, which installs the packed tarballs into a project
per framework under `helix/cem/typings` and runs that framework's own checker
with `skipLibCheck` off: `tsc` for React, Preact, and Solid, `vue-tsc` for Vue,
and `svelte-check` for Svelte. Each project writes good usage and guarded bad
usage, and the runner fails on a guarded line that compiles and on an error
anywhere else.

**`plan` decides, from the same set the run packs.** `run-typings-test.mjs
--touched <base>` answers `true` when a change reaches the packages the projects
install or any workspace package they depend on, `helix/cem`, the manifest
builder in `helix/cli/src/manifest`, or the runner itself. Those are what the
typings are written from and what judges them. A package the projects come to
depend on is in the reach the day they depend on it, with no list here to
update. An unresolvable base answers `true`.

The five installs and checks run side by side and took 16 seconds on a laptop,
measured October 25, 2026, after the build and `analyze` that `warm` restores.

## What every job pays

`setup-bun` caches the binary and not what it installs, so each job used to pay a
cold resolve of the whole tree. The cache is keyed on `bun.lock`, which is exactly
what decides the answer. The key leaves out the workspaces' own `version`
lines, because a release stamp rewrites those lines and nothing else, and no
workspace is downloaded. The cache is saved on `main` and restored on other
branches, because an entry a pull request saves is visible to that pull
request only. Each stamp used to write a new 420 MB entry on `main` and on
every pull request that rebased, and the repository's 10 GB limit then evicted
the Cargo cache that the helix binary builds from. The four steps every job starts with are one local
action, `.github/actions/setup`, which reads the bun version off
`packageManager` so the runtime CI runs on is the one the lockfile was written
by, and there is no second copy of that number to bump.

A browser job adds `.github/actions/browser`: the headless shell, cached under
the Playwright version the lockfile holds, and the system packages it links
against, which include the fonts every baseline was taken with. The packages are
cached as the `.deb` files apt fetched, under the runner image and the
Playwright version, so a browser job installs them with `dpkg` and never waits
on the Ubuntu mirror. A new runner image misses once and installs from the
mirror with a time limit and a second try.

## One build, before the jobs that would each do their own

Every job that reads built output restores it, and with a warm remote cache
that is seconds. The gap the two warm jobs fill is that the cache is warm
*across* runs and cold *within* one: every job starts at the same second on a
commit that invalidates the build, none can restore what none has written yet,
and all of them pay for it.

**Two warm jobs, because the browser jobs want a fraction of the build.** They
render from the frame and the spec bundles, which wait for the components and
not for the docs, so `warm-browser` builds those and finishes while `warm` is
still writing the docs and measuring bundle sizes for `metrics`. Both build
the components, side by side, which is a minute of compute bought for the same
minute off every browser job.

**`warm` leaves out `next build`.** No job after it reads `.next`, so
`.github/scripts/build-for-checks.sh` builds everything `turbo run build` does
except the site's own build, in `warm` and in each job that restores it.
`packaging` builds the whole workspace for `smoke:template`, and that is where
`next build` and `check-highlight.mjs` run.

**`tests` waits on `warm-browser`.** Every spec but those of `helix-docs` reads
the components and the testing harness, which `warm-browser` builds. The
`helix-docs` and site specs read what `metrics` writes, so `floors` runs them
after `warm`, and the two filtered runs together are `turbo run test`.

**Everything else waits on `warm`**, `floors`, `packaging` and `types`
included. They each built their own before, beside it: 139 seconds in
`floors` and 214 in `packaging`, measured September 15, 2026, to make what `warm` was
making at the same time. `lint` reads files and builds nothing, so it alone
starts at once.

**A second turbo command in a job restores what the first built**, and that is
what `turbo.json` has to keep true. Turbo hashes the tree as it stands when a
run starts, so a clean checkout hashes no generated file and every run after
the first hashes them all: a task whose `inputs` reach one has two keys for one
source, and a restore in one job is a rebuild in the next command. `analyze`
reached three kinds and rebuilt fourteen tasks in 81 seconds, in every job that
ran a second command. No generated file is an input of a task another task
depends on; what the file says is carried by the hash of the task that wrote it.

**A judge asks its question under the build's own hash.** Turbo hashes a
pass-through argument into every task of a run, so `turbo run docs -- --check`
wanted every package's `build` under a key with `--check` in it and missed all
of them after a plain build: 105 seconds of rebuilding the workspace, measured
September 16, 2026, in whichever job asked. `docs`, `routes` and `themed-page` are the
three whose graph is the workspace, and each is now a task of its own,
`docs-check` and its two, uncached and depending on exactly what the generator
depends on. The shards and `floors` restore `warm`'s build and ask their
question on top of it. The remaining `-- --check` runs depend on nothing, so
the flag in their key costs nothing.

`tests` is the JavaScript specs. The Rust jobs split on whether a step reads
what `turbo run build` wrote.

**`rust` and `clippy` wait for nothing**, because cargo does not read the
workspace build. Each installs the toolchain, restores its own Cargo cache and
compiles from the first seconds of the run.

- `rust` runs the tests with cargo-nextest, which runs the test binaries side
  by side, and the doctests with `cargo test --doc`, since nextest runs none.
  Together the two run what `rs:test` runs: 812 tests, 2 of them ignored,
  and 30 doctests, the same names in both lists, on October 25, 2026.
- `clippy` runs `rs:check`.

**`cli` is the checks that run a binary over the built tree**: `check:cli`,
the seed tokens, the prose and the spec rules. It compiles from the start of
the run and then waits for `warm` to finish before its own build. Turbo
restores a task only once `warm` has saved it, so a build started earlier
rebuilt what `warm` was still writing, on this job's two cores: 126 seconds on
run 38851933010, where the same step took 8 on run 38675337572 with `warm`
done first. A step asks the API for `warm`'s state, because a `needs` would put
the compile behind `warm` again.

**Each job keeps a Cargo cache of its own, because each builds something
different.** Clippy writes metadata where `cargo build` writes a binary, and
`cargo build` and `cargo test` unify features differently: on a laptop on
October 16, 2026, 257 of the 782 files `rs:build` wrote for dependencies were
missing from what `rs:test` wrote. One shared entry would be whichever job
saved first and a recompile in the others. Handing the binary to `cli` as an
artifact would make every check that runs a rule wait on the job that built it.

**`seed-cargo` writes those entries on `main`.** A push whose tree a pull
request verified runs none of the Rust jobs, and an entry a pull request saves
is visible to that pull request alone, so every pull request after a lockfile
change compiled every dependency from cold: 23 minutes for `rust` on run
38697333389. `seed-cargo` looks each entry up first, and on a miss runs the
job's own command under the job's own key, so a change to one of those jobs'
caches is a change to its matrix too.

**A compile that stops short keeps what it compiled.** `rust-cache` saves only
when a job passes, so a cold compile that ran out of time kept nothing and the
next run started as cold. A job that fails or is stopped saves its target
directory, without the binaries it linked, as a `cargo-progress-…` entry, and
the next run lays the newest one over what `rust-cache` restored. Each run
starts where the last one stopped, until one passes and `rust-cache` saves the
whole. `.github/scripts/stop-cargo.sh` stops the compile first, since a step
that runs out of time leaves cargo running and tar cannot read a directory
rustc is still writing.

**Line tables only** in `rust` and `cli`. On Linux each binary carries the
debug info of every dependency it links: the tests filled the runner's disk
once they linked Wasmtime, and `cli`'s entry was 1,138 MB on run 38851933010
with full debug info. A panic's backtrace still names its file and line.

**Each limit is a warm run and a margin.** A cold compile is the exception
that `seed-cargo` and the progress entries end, and a limit sized for one would
let a hung test hold the gate for half an hour.

Every Rust job installs the floor `Cargo.toml` declares, so `rust-version` is
a number something compiles against.

## How many browser jobs

`fusion/scripts/plan-browser.mjs` decides, in `plan`, and the matrix is what it
prints. Each check is split into as many shards as its share of the corpus needs
to finish in about three minutes. Parity and hydration are scoped to what a
change reaches, so a change to one family plans a job apiece and a change to
`helix/core` plans the whole corpus; visual, smoke and the specs read every
example whatever changed. Contrast is read in the visual shards, on the page
each example is pictured on.

**The specs run twice, in Chromium and in WebKit**, the engine of Safari and of
a Tauri app on macOS and Linux. WebKit's are a check of their own, `specs-webkit`,
because a job installs one browser and the cached system packages are what
that browser added to the image. Its families are weighed by Chromium's seconds
until a run records WebKit's: on a desk on October 10, 2026, the whole suite
took about 200 seconds on one worker in each engine. What is known to fail there, and why, is listed
in `fusion/scripts/lib/known-in-webkit.mjs`. The pictures are Chromium's alone.

**What a family costs is measured, not counted.** It was derived from how many
examples a family holds, and that model is false wherever an example is not a
unit of work: contrast, then a job of its own, read every pair of inks an example paints, and on run
35041878434 its four shards held 142, 142, 142 and 141 examples and took 118,
43, 40 and 43 seconds. So `fusion/scripts/lib/browser-cost.json` holds what each
family took each check, and a family the file does not know falls back to the
per-example estimate, which is what keeps a family added today from weighing
nothing.

**The browser jobs record their own.** Every one of them writes what `pool`
timed for each of its families and uploads it, and the shards of a check are its
corpus divided, so a run's artifacts added together are the corpus once.
`measure-browser.mjs --from` merges them, and its header spells out the two
commands. The alternative is running the checks on a desk, which the same script
does and which is the fallback rather than the first choice: a desk is several
times a two-core runner and not uniformly. Aura was a sixth of contrast on an M2
and a third of it here, a software rasterizer against a GPU, and shards packed
from the M2's reading ran 127 and 84 seconds against 106 each as planned.

**And never more shards than the heaviest family allows**, because a shard holds
whole families: aura was 78 seconds of contrast's 215, so four shards of 54 would
be three jobs billed to finish early while the fourth ran longer than any of
them.

**The planner decides how many and the check decides which.** Each check splits
its own corpus with `@fusion.dev/scripts/shard`: by family, deterministic,
heaviest first onto the lightest shard so far, weighed by the same measurement
the planner sized them with. So the shards of a check are its whole corpus
whatever the count, and a wrong estimate costs time and never coverage. A shard
with nothing to do passes in seconds and says whose work it left to the others.

**The share is set by how a runner is billed**, which is per job and rounded up
to the minute, and the arithmetic counts the jobs as well as the minute each
crosses into. A job is its setup and its share; the setup is 39 seconds,
measured on run 35040430279. A share of 70 keeps a job inside two minutes and
plans 29 of them, which billed 63; 125 plans 16 of three minutes, which is 48,
and the count does not fall again until a job would bill four. What no share
buys is wall clock, and the slack that argument was made against is gone: the
matrix finished 72 seconds before run 35040430279 did, behind `warm` and then
the Rust job, and with both of those off the critical path it is the critical
path. On 35052888764 the gate waited on the longest browser shard with `warm`
two minutes done. A share moved up now buys money with wall clock, and moved
down buys wall clock with money.

## A tree is verified once

A pull request's run verifies the merge of its head into its base. Merged by
rebasing a branch that was up to date, `main` receives a new commit holding that
same tree, and running every job again on it would verify the same files twice.

So `plan` records the tree it checked out as the name of an artifact, and on a
push to `main` the first job, `proven`, looks that name up. A successful
`verify` run on a pull request that recorded this tree skips every other job,
and the gate passes. Anything else, a tree nobody verified, a run that failed or
is still going, a lookup that errored, runs the whole workflow as before. The
tree and not the head, because a head behind its base was verified merged with
a base it no longer matches.

**`proven` runs on a pull request as well, where it answers `false` to a push
that names no tree.** It was skipped there, and a skipped job skips every job
under it, through jobs that ran and succeeded: only a status function in an
`if:` stops that, which `warm` and its neighbors have and `types`, `tests`,
`rust`, `packaging` and the browser matrix did not. Run 35039620254 passed this
gate on a pull request having run `lint` and three builds, because skipped is
neither a failure nor a cancellation. The gate now also refuses a run whose
checks were skipped with no `proven` saying why, so the same hole is a red run
rather than a green one.

`release.yml` does not wait on `verify`, and nothing reads its jobs, so a
skipped run takes nothing from it. What a skipped run would have left behind is
the caches a pull request cannot share, which `seed`, `seed-webkit` and
`seed-cargo` write on `main` when they are missing.

**The examples' diagnostics follow the tree to `main` the same way.** Each
browser shard keeps its runs as an artifact, and on a push to `main` the
`telemetry` job sends them to the console: from the pull request's run that
`proven` names, or from this run when it verified the tree itself. It sends
nothing without the `HELIX_TELEMETRY_KEY` secret and the `HELIX_TELEMETRY_URL`
variable, and the gate does not wait on it.

## One context to require

**The job names are not stable enough to require directly.** A branch protection
rule matches a job name, and this workflow's are `checks (0)` through
`checks (2)` and `browser (parity 3/9)`: the shard counts are arguments and a
browser job's name carries its count, which `plan` changes with every diff, so
changing either silently un-requires whatever was named. One aggregating job
means the rule keeps holding, and a job added to `needs` is covered without
anyone touching the branch settings.

**`needs` alone is not enough.** A needed job that fails skips the aggregator,
and a skipped required check is not a failing one, so the rule would pass on a
red run. `always()` makes it run regardless and the result expression is what
fails it. `skipped` needs no clause of its own: a job `plan` scoped out could not
have failed, and a job skipped because what it needed failed sits beside a
`failure` the expression already reads.
