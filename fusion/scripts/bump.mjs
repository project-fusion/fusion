#!/usr/bin/env node
/**
 * What a range of commits releases, read off their subjects.
 *
 * **One definition, because three workflows ask.** `release-intent` reports it
 * while a pull request is open, `release-experimental` stamps a preview with
 * it, and `release` applies it on merge. Written inline in each, the mapping
 * from `feat` to `minor` would have three copies and the one that drifts is the
 * one nobody runs.
 *
 * **The scope names the domain, and only `helix` and `cortex` publish.** A
 * scope of `helix/cli` releases Helix; `fusion/site` and `turbo` release
 * nothing, being the site and the tooling. A subject with no scope releases
 * nothing, which is the honest reading of a commit that does not say what it
 * touched rather than a default anybody has to remember.
 *
 * **A `!` outranks the type**, and so does a `BREAKING CHANGE:` trailer, which
 * is why the body is read and not only the subject.
 *
 * **A domain in its 0 phase raises the minor for a breaking change**, which is
 * what semver says about a zero major and what `version.mjs` says when it
 * refuses to allocate 1.0.0 without `--allow-major`. That refusal is a backstop
 * and was doing the work: a `!` merged at 0.x failed the release job and went on
 * failing it on every later merge, because the subject stays in the window until
 * something releases. Deciding it here instead means the pull request comment,
 * the experimental stamp and the release matrix all say the same number.
 *
 * The caller names those domains, because this file is given commit messages and
 * nothing else: it runs from `/tmp` under `pull_request_target`, where reading a
 * manifest or a tag is not available to it.
 *
 * Usage:
 *
 *   node fusion/scripts/bump.mjs <range>     # `a..b`, as git takes it
 *   node fusion/scripts/bump.mjs --stdin     # messages, NUL separated
 *   node fusion/scripts/bump.mjs <range> --zero helix,cortex
 *
 * **The stdin form exists for `release-intent`**, which runs as
 * `pull_request_target` with no checkout on purpose: it has a writable token
 * and must never execute a pull request's code. It reads the subjects from the
 * API and pipes them here, so this file is the one from the base branch and the
 * commits are data.
 *
 * Prints one JSON array on stdout, in the shape `release.yml`'s matrix wants:
 * `[{"domain":"helix","level":"minor"}]`, empty when nothing releases.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

/**
 * Which types release, and how far. Everything absent releases nothing.
 *
 * **Only `test` and `ci` are absent, and the reason is that nothing they touch
 * is packed.** Specs are excluded from `dist` and workflows are not in `files`,
 * so neither can change a byte a consumer receives.
 *
 * **Everything else can, which is why everything else releases.** The two
 * documentation packages publish their `content` directory, so `docs` edits a
 * shipped package; `style` changes the emitted bytes; `chore` changes what npm
 * serves; and `build` moves the output directly, a `tsconfig` edit having once
 * taken a megabyte off every package. A type that can reach the registry and
 * does not release is a package describing a version it is not.
 *
 * Releasing too often costs a version number, which is free. Releasing too
 * rarely costs a consumer reading documentation that does not match what they
 * installed.
 */
const LEVELS = {
  build: 'patch',
  chore: 'patch',
  docs: 'patch',
  feat: 'minor',
  fix: 'patch',
  perf: 'patch',
  refactor: 'patch',
  revert: 'patch',
  style: 'patch',
}

/** The two domains that publish. A scope outside them is not a release. */
const DOMAINS = ['helix', 'cortex']

const RANK = { major: 3, minor: 2, patch: 1 }

/** `type(scope)!: description`, with the scope and the bang both optional. */
const SUBJECT = /^([a-z]+)(?:\(([a-z0-9/._-]+)\))?(!)?: .+/

/**
 * The bump one commit asks for, or `undefined` where it asks for none.
 *
 * Takes the whole message rather than the subject, because a breaking change
 * may be declared in a trailer instead of with a bang.
 */
export function bumpOf(message) {
  const [subject] = message.split('\n')
  const found = SUBJECT.exec(subject)
  if (!found) {
    return undefined
  }
  const [, type, scope, bang] = found
  const domain = (scope ?? '').split('/')[0]
  if (!DOMAINS.includes(domain)) {
    return undefined
  }
  const breaking = bang === '!' || /^BREAKING[ -]CHANGE:/m.test(message)
  const level = breaking ? 'major' : LEVELS[type]
  return level ? { domain, level } : undefined
}

/**
 * The highest bump each domain asks for across many commits.
 *
 * `zero` names the domains whose major is still 0, where a breaking change is a
 * minor. A subject still asks for what it asks for: `bumpOf` reports the major,
 * and the project's phase decides what number that comes to.
 */
export function resolve(messages, zero = new Set()) {
  const highest = new Map()
  for (const message of messages) {
    const asked = bumpOf(message)
    if (!asked) {
      continue
    }
    const current = highest.get(asked.domain)
    if (!current || RANK[asked.level] > RANK[current]) {
      highest.set(asked.domain, asked.level)
    }
  }
  return DOMAINS.filter((one) => highest.has(one)).map((domain) => ({
    domain,
    level: highest.get(domain) === 'major' && zero.has(domain) ? 'minor' : highest.get(domain),
  }))
}

if (import.meta.main) {
  const argv = process.argv.slice(2)
  const at = argv.indexOf('--zero')
  /* Taken out before the range is read, so `--zero` can sit on either side. */
  const zero = new Set(at === -1 ? [] : (argv[at + 1] ?? '').split(',').filter(Boolean))
  if (at !== -1) {
    argv.splice(at, 2)
  }
  const argument = argv[0]
  if (!argument) {
    console.error('bump: a git range is required, as `a..b`, or `--stdin`.')
    process.exit(1)
  }
  /* `%B` and a NUL delimiter, so a body carrying blank lines stays one message. */
  const raw =
    argument === '--stdin'
      ? readFileSync(0, 'utf8')
      : execFileSync('git', ['log', '--format=%B%x00', argument], {
          encoding: 'utf8',
          /* A domain with no release tag reads all of history, and the default
             1 MB buffer is an `ENOBUFS` crash at about 2,000 commits. */
          maxBuffer: 512 * 1024 * 1024,
        })
  const messages = raw
    .split('\0')
    .map((one) => one.trim())
    .filter(Boolean)
  console.log(JSON.stringify(resolve(messages, zero)))
}
