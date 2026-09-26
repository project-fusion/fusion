# How a release happens

The workflows in `workflows/` implement this; the reasoning is here so a
contributor reads it once rather than in five headers.

## The model

**Staging is a dist-tag, not a version string.** Packages publish at their real
version under `next`; the template tests then install *that*, from the registry,
from outside the workspace; and promotion is `npm dist-tag add pkg@1.4.0 latest`,
which moves a pointer and builds nothing.

The alternative keeps being proposed and is refused: publish `0.0.1-staging`,
test it, then publish `0.0.1`. That second publish is a second build, so the
bytes users install are bytes no smoke test ever ran, and it cannot be undone,
because a version is permanent while a tag moves back.

**The tag is the record and the npm manifests carry a copy.** The number is
computed from the tag, stamped seconds before packing, and pushed back to `main`
by a GitHub App, which is the one thing in the pipeline that writes to a branch.
The crates rest at `0.0.0-dev` and nothing stamps them: a binary reports the
release it shipped in by reading the manifest npm installed beside it, which is
the same copy. The stamp-back writes the npm manifests and nothing else.

**Two tag prefixes, and they mean different things.** `helix-attempt-v1.4.0` is
pushed before publishing and says a number was spent. `helix-v1.4.0` is pushed
after promotion and says a release happened. Version computation reads both, so a
number is never handed out twice; everything else reads only the second.

Domains release independently, which is what per-domain lockstep means: a Cortex
fix must not bump the Helix docs to a version in which nothing about Helix
changed.

## The switch

`vars.PUBLISHING` is a repository variable with four states, ordered by how much
they permit:

| State | Effect |
|---|---|
| unset | Publishes nothing. Also means "nobody has set this yet" |
| `off` | Publishes nothing, and says a person decided |
| `experimental` | Previews and staging publish; nothing is promoted, so `latest` does not move |
| `on` | The whole pipeline runs and `latest` follows `main` |

A single ordered variable rather than one flag per workflow, because two flags
can disagree and somebody has to remember which of the four combinations is
meant.

**What it does not gate is version allocation**, because nothing is allocated
until the job runs at all. A skipped job burns no number and pushes no tag.

Set it in Settings → Secrets and variables → Actions → Variables. Nothing else
has to change and no commit is needed to flip it back.

## Subjects decide the bump

`release-intent.yml` reports what merging would release and fails on a subject
that is not conventional. It writes no labels: a reviewer wanting a different
bump edits the commit.

**The pull request title is checked as a subject too, because a squash merge
makes it one.** GitHub squashes under the sole commit's subject when a branch
holds one commit and under the title when it holds more, so a prose title reaches
`main` and parses as nothing. #76 merged that way: two `fix(helix)` commits
collapsed under `Release on docs, style and chore`, and the release was skipped
in silence.

A conventional title does not make a squash safe, only quiet in one fewer way. A
squash keeps one subject, so a branch spanning both domains still loses whichever
the title does not name.

**Which is why the repository merges by rebase only**, squash and merge commits
both off. A rebase replays every subject onto `main` individually, so nothing is
collapsed and the history stays linear. The title check is then a guard against
squash being turned back on rather than a fix for it.

## Experimental builds

Label a pull request `release:experimental` and, if the author is on the team, it
publishes under `exp-<number>`.

**The author, not an approval.** The `experimental` environment carries no
protection rules and never has: required reviewers on a private repository need
Enterprise, and the API refuses to set them with a 422. This claimed for months
that the job "waits for a reviewer", which described a gate that did not exist.
`author_association` says the same thing where it is actually enforced.

**The label stays, because npm is permanent.** Every run publishes every package
in the domains the branch touches, and a published version can be deprecated but never withdrawn. Authorship answers
who may publish a preview; the label answers whether this branch wants one.

**This runs the pull request's code with a publish token**, so the label is a
statement about the diff. That is the residual risk and no configuration removes
it, which is why the author check is not decoration. `pull_request`, not
`pull_request_target`: a fork gets no secrets on this event, so a fork's build
cannot publish whatever it is labeled.

## The binary

`@fusion.dev/helix-cli` is a launcher, and the `helix` it runs is Rust, so it
ships the way Biome and esbuild ship theirs. There's one package per platform,
each declaring the `os` and `cpu` it runs on and carrying one file, and all of
them are optional dependencies of the command. npm installs the one that matches
and skips the rest.

| Package | Built on | Target |
|---|---|---|
| `helix-cli-darwin-arm64` | `macos-14` | `aarch64-apple-darwin` |
| `helix-cli-darwin-x64` | `macos-14` | `x86_64-apple-darwin`, cross-compiled |
| `helix-cli-linux-arm64` | `ubuntu-24.04-arm` | `aarch64-unknown-linux-musl` |
| `helix-cli-linux-x64` | `ubuntu-latest` | `x86_64-unknown-linux-musl` |
| `helix-cli-win32-x64` | `windows-latest` | `x86_64-pc-windows-msvc` |

**Built before the release computes its number, from the same tags.**
`binaries.yml` builds each platform, the release computes the number,
`place-binaries.sh` puts each binary in its package, and `publish.mjs` refuses a
platform package whose binary is missing, isn't executable, or reports another
version. The version is checked on the runner's own platform and, before upload,
on every platform that can run its build.

**A binary reports the version it is shipped as, and one build serves many
releases.** It reads the `package.json` npm installed beside it, falling back to
the `0.0.0-dev` it was compiled at where there is none, so the release number is
no longer inside the file. That is what lets `binaries.yml` cache the five
binaries on a hash of the Rust alone: the number used to be in the key because it
was in the binary, and a release is always at a new number, so every release
rebuilt all five however little Rust had moved. Measured over four releases in
September 2026, that was about 53 billed minutes a release, over 40 of them
macOS, for a build whose output was what the last one had already produced.

The proof moved with it. `binaries.yml` copies each binary next to a manifest at
the version being published and asks it there, because the bare file reports only
what it was compiled at; `publish.mjs` asks the real platform package, after the
release has stamped it, which is the arrangement a consumer installs.

**A Linux binary is static**, linked against musl, so one file runs on a glibc
distribution and on Alpine alike, and the packages declare no `libc`.

**A Helix release with no binaries refuses in its first step**, before a number
is allocated. A Cortex release in the same run goes ahead.

**Nothing in a checkout needs them.** The files are gitignored, and the shim runs
the cargo target's build before a platform package's, so a checkout runs what it
built.

`npm create @fusion.dev/helix-app` is `@fusion.dev/create-helix-app`, which
depends on the command and the templates and runs `helix new` on them. It's
scoped because `create-helix-app` on npm belongs to an unrelated project.

## A new package

**Trusted publishing cannot publish a package the first time.** npm attaches a
publisher to a package rather than to a scope, and OIDC can't create one. A
release that reached a new package would publish every package before it and
stop, leaving the domain half out under `next` and a number spent. So the release
asks the registry first, before allocating anything, and refuses with the names.

The first publish is a person's, once, from a machine that is logged in:

```sh
bun run build
node fusion/scripts/publish.mjs --domain helix --bootstrap
bun run trust --apply
```

`--bootstrap` publishes only the packages the registry has never seen, at the
resting `0.0.0-dev` under `exp-0`. A pre-release spends no number and nothing
resolves to it by asking for a range, so a platform package can go out as a
placeholder without its binary. `trust --apply` then registers both release
workflows for every package. After that the release publishes them like any
other.

An experimental release has no token to ask with, so it doesn't preflight. A
new package stops it at that package, which spends no number.

## The scripts

Anything longer than a few lines lives in `scripts/` rather than inline, so it
can be read, and so its reasoning sits with the code rather than above the step.

| Script | What it does |
|---|---|
| `resolve-intent.sh` | What merging this commit releases, per domain |
| `report-intent.sh` | Checks every subject on a pull request and reports the bump |
| `record-release.sh` | Tags the release and builds its notes |
| `stamp-manifests.sh` | Writes the published version back into the manifests |
| `stamp-experimental.sh` | Stamps a preview version into every domain a branch touches |
| `comment-install.sh` | Comments on the pull request with how to install it |
| `place-binaries.sh` | Puts each built `helix` in its platform package, executable |
| `touched.sh` | Whether a push can reach the browser, so `verify` can skip |

## Why the range runs from the tag

`release.yml`'s `intent` job reads what a merge releases from the subjects it
brought, never from a label: a second machine-readable channel for one fact is a
second place for it to be wrong, and the copy that is not in the commit is the
one that drifts.

**The range runs from the domain's last release, not from this merge.** A
merge-shaped range reads only what one merge carried, so a release that skips or
fails orphans those commits: nothing later looks at them again and the work ships
in no version. Two `feat(helix)` subjects, the templates package and `helix new`,
sat on `main` unreleased behind `helix-v0.0.10` for exactly that reason.

From the tag, the window is whatever has not shipped yet, so a skipped release is
picked up by the next push and a release that succeeds closes the window behind
it. `fetch-depth: 0` and the tags, because the range is the point: a shallow
clone reports no tags and every domain looks like its first release.

## The App that writes to `main`

**A GitHub App, because the push has to be allowed and has to be seen.**
`GITHUB_TOKEN` cannot do this twice over: `main` requires a pull request, so a
direct push from it is declined before any check is consulted, and a branch it
pushes does not trigger workflows.

**What makes the App's push land is the ruleset, not the App.** Under classic
branch protection with the App in `bypass_pull_request_allowances` it was
rejected by two rules rather than one: *"Changes must be made through a pull
request"* and *"Required status check `verify` is expected"*. That list exempts
an actor from the pull request requirement and from nothing else, so `[skip ci]`
made the rejection certain. `main` is governed by a ruleset now, where a bypass
actor skips every rule in it, so moving `main` back to classic protection would
break the stamp step without touching any file here.

**The bypass is the cost and it is worth naming.** `version.mjs` refused to write
the version back precisely to avoid standing write access that outranks branch
protection. This is that access, narrowed as far as it goes: one App,
`contents: write` and nothing else, used by one step that runs only after a
version published, installed from the registry and promoted.

**`[skip ci]` because there is nothing here for CI to learn.** The push would
otherwise start `verify` on a commit whose entire content is version
fields and a lockfile the runner just produced. This is the one commit on `main`
that `verify` does not judge.

**The same marker on a pull request is a hazard, and `release-intent` now fails
on it.** The difference is who is writing and what is being suppressed: here it
is one bot push whose content is known, and there it is a contributor's head
commit suppressing the checks that were going to judge their own diff. GitHub
honors the markers anywhere in the head commit's message, body included, so on
September 2, 2026 a commit whose body *explained* the hazard suppressed every `verify`
run on its own pull request: no run, no error, a required check that never
reported, and BLOCKED. Four re-triggers carried the same message and failed the
same way, which reads as broken infrastructure rather than as the diff.

The check has to live in `release-intent` and can live nowhere else: that
workflow runs on `pull_request_target`, which the markers do not suppress, so it
is the only one that survives the thing it detects. Writing about the marker is
writing the marker, which is how this happened the first time, so describe it
rather than quoting it.

## Tokens, and which step gets one

**`analyze` is on the critical path of packing**, and only since the manifests
stopped being tracked. `files` names `custom-elements.json` and the three
framework typings, and `build` does not produce them: turbo has `analyze`
depending on `build` rather than the other way round, so a build alone leaves
them absent and the tarball ships without files its own manifest promises.

**One token, on the two steps that need one and nowhere else.** The packages are
restricted, so an unauthenticated install 404s exactly as a missing package
would, and the smoke test is the only step that installs as a consumer rather
than publishing as the workflow.

It is the same secret the promote step takes, and it is read-write because
promotion has to be. A read-only twin was considered and is not worth a second
secret to rotate: both steps run in the same job on the same runner.

**It must not reach the publish step**, which authenticates by OIDC and has to
find no credential at all. A token in the job's environment would make npm read
itself as configured and skip the exchange, which is why it sits on the step
rather than on the job. `run-template-test.mjs` writes the `.npmrc` into the
scratch project itself, so nothing outside that directory is authenticated.

**Promotion runs only at `on`.** At `experimental` the version is published,
proved, and left at `next`: it exists, a consumer can install it by name, and
`latest` still points where it did. The number is already burnt by the attempt
tag, so stopping there costs nothing and repeats nothing.

**Promotion needs a credential where publishing does not.** Trusted publishing
grants `npm publish` and not `dist-tag add`: npm's publisher page offers
`npm publish` and `npm stage publish` and nothing else, and a promote by OIDC
came back `401` on the dist-tags endpoint. `publish.mjs` writes the token to a
temporary config it passes on the command line, so it never reaches `~/.npmrc`.

## Two traps in the runner setup

**Never add `registry-url` to `setup-node`.** Given one it writes an `.npmrc`
carrying `//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}`, its own variable
rather than the `NPM_TOKEN` the steps read. Nothing sets it, so npm reads itself
as configured with a credential, stops before the OIDC exchange, publishes as
nobody, and the registry refuses the write. **A refused write is reported as a
404**, naming the package as if it did not exist, so it does not look like an
auth failure. The default registry is already npmjs.org, so the line buys nothing.

**npm has to be installed over the one Node ships.** `setup-node` installs
whatever npm comes with the Node it pins, and 22.20.0 ships npm 10.9.x, which
predates trusted publishing. Without the explicit install the run reports an
authentication failure rather than naming a version, so it reads as a registry
problem and is a runner one.
