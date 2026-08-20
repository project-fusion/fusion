#!/usr/bin/env node
/**
 * Publishes a domain, from tarballs, under a tag that is never `latest`.
 *
 * **What is packed is what is published.** Each package is packed once and that
 * exact file is handed to `npm publish`, rather than letting publish do its own
 * pack. It is the same tarball `bun run test:template` installed, byte for byte
 * and integrity hash for integrity hash, so "the tests passed" is a statement
 * about the artifact rather than about a build that preceded another build.
 *
 * **Promotion moves a tag, it does not republish.** Staging publishes at the
 * real version under `next`; promotion is `npm dist-tag add pkg@version latest`
 * and nothing is rebuilt. The alternative that keeps being proposed, a
 * `0.0.1-staging` version promoted by publishing `0.0.1`, ships bytes to users
 * that no smoke test ever ran, because the second publish is a second build.
 * It also cannot be undone: promotion here is moving the tag back.
 *
 * **`bun install` must have run since the version was stamped.** `bun pm pack`
 * reads a sibling's version from `bun.lock` rather than from that sibling's
 * manifest, so packing straight after stamping pins every sibling at the
 * previous release. Measured, silent, and a broken install for everyone who
 * takes it. This refuses to publish when it sees it, and `test:template` says
 * the same thing from the consumer's side.
 *
 * **Open question, and it decides whether promotion works at all.** Trusted
 * publishing grants `--allow-publish`, and `npm trust` has no flag for moving a
 * dist-tag. If the OIDC token authorizes publishing but not
 * `npm dist-tag add`, the promotion step below cannot authenticate and the
 * release stops after staging. Verify this on the first real release rather
 * than at the moment it is needed. If it turns out unauthorized, the narrowest
 * fix is a granular token scoped to these two scopes used by the promote step
 * only, which leaves the publish itself credential-free.
 *
 * Related and worth reading before building around this: npm now has
 * `npm stage publish`, a first-class staged release that may express exactly
 * the publish-then-promote shape this file implements by hand.
 *
 *   node tooling/scripts/publish.mjs --domain helix --tag next
 *   node tooling/scripts/publish.mjs --domain helix --tag next --dry-run
 *   node tooling/scripts/publish.mjs --domain helix --tag bootstrap --otp 123456
 *   node tooling/scripts/publish.mjs --domain helix --promote latest --version 1.4.0
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DOMAINS, domainOf, manifests, publishes, root } from './workspace.mjs'

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
const tag = argument('tag')
const promote = argument('promote')
const pinned = argument('version')
const dry = flag('dry-run')
const otp = argument('otp')

if (!Object.keys(DOMAINS).includes(domain)) {
  fail(`--domain must be one of ${Object.keys(DOMAINS).join(', ')}, not \`${domain}\`.`)
}
if (promote === undefined && tag === undefined) {
  fail('--tag is required when publishing. `latest` is reached by --promote, never directly.')
}
if (tag === 'latest') {
  fail(
    'Refusing to publish straight to `latest`. Publish under `next`, let the template tests run ' +
      'against what was published, then `--promote latest`, which moves the tag rather than ' +
      'building a second artifact nobody tested.',
  )
}

/* The domain's shipping members. A private package versions with its siblings
   and is stamped like them, and it is not published: a Helix byproduct is still
   Helix, and `@helix-io/cem` is a build tool for this repository. */
const packages = [...manifests()].filter(
  ([name, { manifest }]) => domainOf(name) === domain && publishes(manifest),
)
if (packages.length === 0) {
  fail(`No published packages in \`${domain}\`.`)
}

const run = (command, args, cwd) =>
  execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

/**
 * npm, with its own error message kept.
 *
 * `execFileSync` pipes stderr and throws an Error whose message is only
 * `Command failed: npm publish ...`, so an uncaught throw reports that a publish
 * failed and nothing whatsoever about why. "You cannot publish over the
 * previously published versions", "payment required", and "you must be logged
 * in" all arrive looking identical, and the second of those is exactly what a
 * free organization says.
 *
 * Two of these are common enough to be worth naming outright, because the npm
 * text is accurate and still does not say what to do next.
 */
function npm(args, doing) {
  try {
    return run('npm', args, root)
  } catch (error) {
    const output = `${error.stderr ?? ''}${error.stdout ?? ''}`.trim()
    console.error(`\nnpm could not ${doing}.\n`)
    console.error(output === '' ? '  (npm said nothing)' : `  ${output.split('\n').join('\n  ')}`)

    if (/cannot publish over|EPUBLISHCONFLICT|previously published/i.test(output)) {
      console.error(
        '\n  That version is already on the registry, which means a previous run published it ' +
          'and did not finish. The release should have allocated a new number instead: check ' +
          `that the \`${domain}-attempt-v*\` tag was pushed before publishing, because that is ` +
          'what stops a number being handed out twice.',
      )
    }
    if (/two-factor|bypass 2fa|otp/i.test(output)) {
      console.error(
        '\n  npm requires two-factor authentication to publish. This applies to a person at a ' +
          'keyboard and not to CI, where trusted publishing authenticates by OIDC and is exempt, ' +
          'which is the whole reason it is worth having.\n\n' +
          '  Enable 2FA on the account. If you set it to "authorization only", publishing needs ' +
          'no code and this command works as it is. If you set it to "authorization and writes", ' +
          'pass the code: --otp 123456.',
      )
    }
    if (/payment required|402|paid|private packages/i.test(output)) {
      console.error(
        '\n  Restricted packages need a paid organization. Either upgrade the org, or set ' +
          '`publishConfig.access` to `public` across every published package at once.',
      )
    }
    process.exit(1)
  }
}

/* Promotion: no build, no pack, no publish. A pointer moves. */
if (promote !== undefined) {
  if (pinned === undefined) {
    fail('--promote needs --version, so the tag is moved onto a release rather than onto "newest".')
  }
  for (const [name] of packages) {
    const target = `${name}@${pinned}`
    console.log(`  ${target} -> ${promote}`)
    if (!dry) {
      npm(
        ['dist-tag', 'add', target, promote, ...(otp === undefined ? [] : ['--otp', otp])],
        `move \`${promote}\` onto ${target}`,
      )
    }
  }
  console.log(`${domain} ${pinned}: ${packages.length} packages now ${promote}`)
  process.exit(0)
}

const version = packages[0][1].manifest.version
const staging = mkdtempSync(join(tmpdir(), `${domain}-publish-`))
const published = []

for (const [name, { directory, manifest }] of packages) {
  if (manifest.version !== version) {
    fail(
      `${directory}: \`${name}\` is ${manifest.version} while the domain is ${version}. Lockstep ` +
        'is one version per domain, and half a release is worse than none.',
    )
  }

  const into = join(staging, name.replace('@', '').replace('/', '-'))
  mkdirSync(into, { recursive: true })
  run('bun', ['pm', 'pack', '--destination', into], join(root, directory))
  const [file] = readdirSync(into)
  if (file === undefined) {
    fail(`${directory}: packed nothing.`)
  }

  /* The stale-lockfile fault, refused before it reaches the registry rather
     than after, because a published version cannot be taken back. */
  const packed = JSON.parse(run('tar', ['-xzOf', join(into, file), 'package/package.json'], root))
  for (const [dependency, range] of Object.entries(packed.dependencies ?? {})) {
    if (domainOf(dependency) === domain && range !== version) {
      fail(
        `${name}@${version} would ship a dependency on \`${dependency}@${range}\`. Run ` +
          '`bun install` after stamping the version: `bun pm pack` reads the sibling version ' +
          'from `bun.lock`, not from the manifest.',
      )
    }
  }

  console.log(`  ${name}@${version} (${file})`)
  if (!dry) {
    npm(
      [
        'publish',
        join(into, file),
        '--tag',
        tag,
        '--access',
        'restricted',
        ...(otp === undefined ? [] : ['--otp', otp]),
      ],
      `publish ${name}@${version}`,
    )
  }
  published.push(name)
}

console.log(
  `${domain} ${version}: ${published.length} packages published under \`${tag}\`` +
    `${dry ? ' (dry run, nothing left this machine)' : ''}`,
)
