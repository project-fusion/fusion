#!/usr/bin/env node
/**
 * What version a domain is about to publish, and stamping it in.
 *
 * **The tag is the record, not the manifest.** Every manifest carries
 * `0.0.0-dev` and always will. The alternative is a release commit pushed back
 * to `main` by CI, which needs a bot with write access that outranks branch
 * protection: a standing hole in exactly the place the governance gate is
 * supposed to be strongest, opened to record a number `git tag` already holds.
 *
 * The stamping has to happen either way. `bun pm pack` rewrites a
 * `workspace:*` dependency to the version in the depended-on package's own
 * manifest, so `@fusion.dev/helix` ships a hard requirement on whatever
 * `@fusion.dev/helix-core` said at pack time. Every manifest in the domain is therefore
 * written before anything is packed, and the only question was ever whether
 * that edit is also committed. It buys nothing, so it is not.
 *
 * **A number is allocated before it is used, and never reused.** Two tag
 * prefixes, and the difference matters: `helix-v1.4.0` means a release that
 * promoted, and `helix-attempt-v1.4.0` means a number that was handed out.
 * The next version is computed from the highest of *both*, so a release that
 * publishes to `next` and then fails its template tests burns that number
 * rather than poisoning the pipeline.
 *
 * Without this the failure is permanent and quiet. Nothing tags, so the next
 * merge computes the same version, npm refuses to publish over a version that
 * exists, and every merge after that fails identically until someone unpublishes
 * by hand. Resuming instead of advancing would be worse: it would promote the
 * artifact that failed its tests, which is the one outcome the tests exist to
 * prevent.
 *
 * **One version per domain**, which is the lockstep policy. `helix` and
 * `cortex` move independently, so `helix-v1.4.0` and `cortex-v0.3.0` are
 * separate tags and a release of one leaves the other alone. `fusion workspace`'s `publishable`
 * holds the manifests to a single string; this writes it.
 *
 * **`cortex` spans two package managers.** `@fusion.dev/cortex-docs` is npm and the
 * crates are Cargo, and the version they share lives in `[workspace.package]`.
 * Stamping writes both. Note that this leaves `Cargo.lock` naming the old
 * version of the workspace crates, so anything running afterwards must let
 * cargo update it rather than passing `--locked`.
 *
 * Pre-release versions are never tagged, so a tag scan ignores anything
 * carrying a `-`. An experimental build off a pull request is
 * `1.4.0-exp.42.ga1b2c3d`: the version it would be if merged, marked as not
 * being it, and unique per push so a re-run never collides with itself.
 *
 * The `g` on the commit is load-bearing. A pre-release identifier of digits
 * only is numeric and may not lead with a zero, so a short SHA like `0123456`
 * makes the whole version invalid and npm rejects it. Roughly one commit in
 * 270. `git describe` prefixes `g` for exactly this reason.
 *
 *   node fusion/scripts/version.mjs --domain helix
 *   node fusion/scripts/version.mjs --domain helix --bump minor
 *   node fusion/scripts/version.mjs --domain helix --bump minor --pre exp.42.ga1b2c3d --write
 *   node fusion/scripts/version.mjs --domain helix --set 0.0.0-dev --write
 *
 * `--set` bypasses the tag scan, which is how the manifests are returned to
 * their resting value and how a release is pinned by hand if one ever has to be.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DOMAINS, domainOf, manifests, root } from '@fusion.dev/scripts/workspace'

const LEVELS = ['major', 'minor', 'patch']

const argument = (name) => {
  const at = process.argv.indexOf(`--${name}`)
  return at === -1 ? undefined : process.argv[at + 1]
}
const flag = (name) => process.argv.includes(`--${name}`)

const fail = (message) => {
  console.error(message)
  process.exit(1)
}

const domain = argument('domain')
const bump = argument('bump')
const pre = argument('pre')
const set = argument('set')

if (!Object.keys(DOMAINS).includes(domain)) {
  fail(`--domain must be one of ${Object.keys(DOMAINS).join(', ')}, not \`${domain}\`.`)
}
if (bump !== undefined && !LEVELS.includes(bump)) {
  fail(`--bump must be one of ${LEVELS.join(', ')}, not \`${bump}\`.`)
}
if (set !== undefined && !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(set)) {
  fail(`--set must be a version, not \`${set}\`.`)
}

const parse = (version) => version.split('.').map(Number)
const compare = (a, b) => {
  const [x, y] = [parse(a), parse(b)]
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]
}

/**
 * The highest version this domain has ever allocated, released or merely
 * attempted. `0.0.0` when there are none, so the first release chooses its own
 * opening number through `--bump`: patch opens at `0.0.1`, minor at `0.1.0`,
 * major at `1.0.0`.
 *
 * Both prefixes are scanned. Bumping from the last *released* version alone
 * would hand out a number that a failed run already published, and npm does not
 * allow publishing over it.
 */
function allocated() {
  const versions = []
  for (const prefix of [`${domain}-v`, `${domain}-attempt-v`]) {
    let output = ''
    try {
      output = execFileSync('git', ['tag', '--list', `${prefix}*`], { cwd: root, encoding: 'utf8' })
    } catch {
      continue
    }
    versions.push(
      ...output
        .split('\n')
        .map((tag) => tag.trim().slice(prefix.length))
        .filter((version) => /^\d+\.\d+\.\d+$/.test(version)),
    )
  }
  return versions.sort(compare).at(-1) ?? '0.0.0'
}

const raise = (version, level) => {
  const [major, minor, patch] = parse(version)
  if (level === 'major') {
    return `${major + 1}.0.0`
  }
  if (level === 'minor') {
    return `${major}.${minor + 1}.0`
  }
  return `${major}.${minor}.${patch + 1}`
}

/**
 * Nothing crosses to `1.0.0` without saying so on the command line.
 *
 * **The first release chooses its own opening number, and one of the choices is
 * `1.0.0`.** `allocated()` returns `0.0.0` while a domain has no tags, so a
 * pull request labelled `<domain>:major` publishes 1.0.0 as its very first
 * release. That is one label away at all times, the label is the only thing
 * that decides it, and `release-intent` proposes `patch` rather than refusing
 * anything above it.
 *
 * **And it cannot be taken back.** The `attempt` tag is pushed before anything
 * is published, precisely so a number is never handed out twice, and npm will
 * not accept a republish over a version that exists. A 1.0.0 allocated by
 * accident on a Friday is the version this project shipped.
 *
 * So a major stays inside `0.` unless `--allow-major` is passed, which the
 * workflow does not pass and a person has to type. Under semver's own reading
 * of a zero major that is also the more correct arithmetic: while the major is
 * 0 the API is unstable by declaration, and a breaking change raises the minor.
 *
 * `--set` is checked too. It exists to pin a release by hand and to return the
 * manifests to `0.0.0-dev`, and neither wants a silent route past this.
 */
const ALLOW_MAJOR = flag('allow-major')

const refuseMajor = (version, why) => {
  if (parse(version)[0] < 1 || ALLOW_MAJOR) {
    return version
  }
  fail(
    `version: ${why} would allocate ${version}, and this project is in its 0. phase.\n\n` +
      '  A number is tagged before it is published and npm refuses a republish, so\n' +
      '  1.0.0 allocated by accident is the version this project shipped.\n\n' +
      '  Pass `--allow-major` if 1.0 is the decision being made. While the major is\n' +
      '  0 a breaking change raises the minor, which is what semver says about a\n' +
      '  zero major and what `--bump minor` already does.',
  )
}

const base =
  set !== undefined
    ? refuseMajor(set, '`--set`')
    : bump === undefined
      ? allocated()
      : refuseMajor(raise(allocated(), bump), `\`--bump ${bump}\``)
const version = pre === undefined ? base : `${base}-${pre}`

if (flag('write')) {
  const written = []

  for (const [name, { directory, file, manifest }] of manifests()) {
    if (domainOf(name) !== domain) {
      continue
    }
    manifest.version = version
    writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`)
    written.push(directory)
  }

  /* The crates share the domain's version through `[workspace.package]`. */
  if (domain === 'cortex') {
    const file = join(root, 'Cargo.toml')
    const toml = readFileSync(file, 'utf8')
    const section = toml.indexOf('[workspace.package]')
    if (section === -1) {
      fail('Cargo.toml has no `[workspace.package]`, which is where the Cortex version lives.')
    }
    const head = toml.slice(0, section)
    const tail = toml.slice(section).replace(/^version = "[^"]*"$/m, `version = "${version}"`)
    writeFileSync(file, head + tail)
    written.push('Cargo.toml')
  }

  console.error(`${domain} ${version}: stamped ${written.length} manifests (${written.join(', ')})`)
}

/* Stdout is the version and nothing else, so a workflow can read it directly. */
console.log(version)
if (process.env.GITHUB_OUTPUT) {
  writeFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`, { flag: 'a' })
}
