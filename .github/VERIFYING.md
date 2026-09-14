# How CI is split

**No Node on the runner.** `cem analyze` runs under `bun --bun` and the
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

## What every job pays

`setup-bun` caches the binary and not what it installs, so each job used to pay a
cold resolve of the whole tree. The cache is keyed on `bun.lock`, which is exactly
what decides the answer. The four steps every job starts with are one local
action, `.github/actions/setup`, which reads the bun version off
`packageManager` so the runtime CI runs on is the one the lockfile was written
by, and there is no second copy of that number to bump.

## One build, before the many that would each do their own

Every check shard runs `build`, `analyze` and `catalog` as prerequisites and
every browser job runs `build`, so with a warm remote cache they all cost a
restore. The gap the `warm` job fills is that the cache is warm *across* runs and
cold *within* one: every job starts at the same second on a commit that
invalidates the build, none can restore what none has written yet, and all of
them pay for it. A cold build is about 52 seconds.

**Only `checks` and `browser` wait on it**, which is the whole of the trade.
`lint` reads files and builds nothing. `types` and `tests` do pay a cold build,
and at 1m19s and 2m14s they are inside the budget already, so gating them would
buy a faster job nobody is waiting on and cost every run the stage.

**It costs a stage the wall clock did not have**, about 40 seconds on a run that
restores and 85 on one that does not. The ceiling on any single job comes down
and the floor under every run goes up, which is the right way round when a job
that overruns is the thing being fixed.

## One context to require

**The job names are not stable enough to require directly.** A branch protection
rule matches a job name, and this workflow's are `checks (0)` through
`checks (9)` and `browser (smoke, bun run smoke:examples)`: the shard count is an
argument and the matrix label carries the command, so renaming a script or
changing the count silently un-requires whatever was named. One aggregating job
means the rule keeps holding, and a job added to `needs` is covered without
anyone touching the branch settings.

**`needs` alone is not enough.** A needed job that fails skips the aggregator,
and a skipped required check is not a failing one, so the rule would pass on a
red run. `always()` makes it run regardless and the result expression is what
fails it. `skipped` needs no clause of its own: a job `plan` scoped out could not
have failed, and a job skipped because what it needed failed sits beside a
`failure` the expression already reads.
