#!/usr/bin/env node
/**
 * Publishes a domain, from tarballs, under a tag that is never `latest`.
 *
 * **What is packed is what is published.** Each package is packed once and that
 * exact file is handed to `npm publish`, rather than letting publish do its own
 * pack. It is the same tarball `bun run smoke:template` installed, byte for byte
 * and integrity hash for integrity hash, so "the tests passed" is a statement
 * about the artifact rather than about a build that preceded another build.
 *
 * **Promotion moves a tag, it does not republish.** Staging publishes at the
 * real version under `next`; promotion is `npm dist-tag add pkg@version latest`
 * and nothing is rebuilt. The obvious alternative, a `0.0.1-staging` version
 * promoted by publishing `0.0.1`, ships bytes to users that no smoke test ever
 * ran, because the second publish is a second build. It also cannot be undone:
 * promotion here is moving the tag back.
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
 *   node fusion/scripts/publish.mjs --domain helix --tag next
 *   node fusion/scripts/publish.mjs --domain helix --tag next --dry-run
 *   node fusion/scripts/publish.mjs --domain helix --tag exp-0 --otp 123456
 *   node fusion/scripts/publish.mjs --domain helix --promote latest --version 1.4.0
 */
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DOMAINS, domainOf, manifests, publishes, root } from '@fusion.dev/scripts/workspace'

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

/* The domain's shipping members. A private package versions and is stamped with
   its siblings and still never publishes. */
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
    /* `EOTP` and the sentence npm prints beside it, and nothing looser. A
       pattern matching `bypass 2fa` catches the deprecation notice npm prints
       on every token-authenticated command, so every failure under a token
       arrives wearing two-factor advice whatever its cause. */
    if (/EOTP|one-time password/i.test(output)) {
      console.error(
        '\n  npm wants a one-time password, which means two-factor is set to "authorization and ' +
          'writes". Two-factor is already on: this is not a prompt to enable it.\n\n' +
          '  Three ways past it, and the first is usually the one wanted here.\n\n' +
          '    A token in the environment. A granular or automation token publishes with no ' +
          'one-time password:\n\n' +
          '      env "npm_config_//registry.npmjs.org/:_authToken=$NPM_ADMIN_TOKEN" \\\n' +
          '        node fusion/scripts/publish.mjs --domain <domain> --tag exp-0\n\n' +
          '    A token cannot do `npm trust`, so it finishes the first publish and none of the ' +
          'registrations that follow it.\n\n' +
          '    Two-factor on "authorization only", set in the web settings and set back after. ' +
          'Login stays behind whatever guards it.\n\n' +
          '    `--otp 123456`, if the account has an authenticator app. A passkey account has no ' +
          'code to pass: npm offers a browser challenge instead, and this script cannot present ' +
          'one, because it pipes stdio and the prompt reaches no terminal.\n\n' +
          '  CI meets none of this. Trusted publishing authenticates by OIDC and is exempt, which ' +
          'is the whole reason it is worth having.',
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
  /* **Promotion needs a credential, and trusted publishing cannot grant one.**
     Measured 31 Aug 2026 on the first release that got this far: the publish
     succeeded by OIDC and `dist-tag add` came back
     `401 Unauthorized - GET .../@fusion.dev%2fhelix-core/dist-tags`. npm's
     trusted publisher page offers `npm publish` and `npm stage publish` and
     nothing else, so moving a tag is not a permission it can hand out at all.

     So the token goes here and only here, written to a config file passed on
     the command line rather than into the environment or into `~/.npmrc`. The
     publish above has to keep finding no credential: `registry-url` on
     `setup-node` once left an empty `_authToken` behind, npm read itself as
     configured, never exchanged the OIDC token, and the registry refused the
     write as a 404. */
  let userconfig
  if (process.env.NPM_TOKEN) {
    userconfig = join(mkdtempSync(join(tmpdir(), 'promote-')), '.npmrc')
    writeFileSync(userconfig, `//registry.npmjs.org/:_authToken=${process.env.NPM_TOKEN}\n`, {
      mode: 0o600,
    })
  } else {
    console.error(
      'promote: no `NPM_TOKEN`. Trusted publishing grants `npm publish` and not ' +
        '`dist-tag add`, so this step needs a token of its own and will fail without one.',
    )
  }
  for (const [name] of packages) {
    const target = `${name}@${pinned}`
    console.log(`  ${target} -> ${promote}`)
    if (!dry) {
      npm(
        [
          'dist-tag',
          'add',
          target,
          promote,
          ...(userconfig === undefined ? [] : ['--userconfig', userconfig]),
          ...(otp === undefined ? [] : ['--otp', otp]),
        ],
        `move \`${promote}\` onto ${target}`,
      )
    }
  }
  console.log(`${domain} ${pinned}: ${packages.length} packages now ${promote}`)
  process.exit(0)
}

/**
 * Removes the source maps from a packed tarball, and their references with them.
 *
 * **Every map we ship is inert, measured rather than assumed.** Packed for real:
 * 1,158 maps across `@fusion.dev/helix-core`, `@fusion.dev/helix-headless` and `@fusion.dev/helix`,
 * **none with `sourcesContent`, and all 1,158 naming a `sources` path that is
 * not in the tarball**. `files` is `custom-elements.json` plus `dist`, so
 * `package/src/` has no entries at all. The trade this was meant to buy, a
 * consumer stepping into `HelixHeadlessButton` and getting our TypeScript, was
 * never on offer: it is cost with nothing bought.
 *
 * **Four peers, unpacked the same day.** MUI, Base UI and Web Awesome ship zero
 * maps and, sampled at 400 code files each, zero `sourceMappingURL` comments:
 * stripped, not merely omitted. React Spectrum is the one that publishes them
 * and does it thoroughly, 47 percent of a 13MB tarball with every source
 * inlined and no declaration maps at all. Nobody ships the state we were in.
 *
 * **Stripping the files alone would be worse than shipping them.** Every emitted
 * file ends in `//# sourceMappingURL=…`, so dropping the maps and leaving the
 * comments points every published file at something that is not there. Zero
 * dangling references is the one thing all six peer packages have in common, so
 * the comment goes with the file.
 *
 * **Here rather than in `tsconfig`**, because the maps work in this repository
 * and only stop working once packed: `dist/tag/root/tag-root.js.map` resolves to
 * `helix/styled/src/tag/root/tag-root.ts`, which is there, and `declarationMap` is
 * what lands go-to-definition on the source for `fusion/site` and every
 * cross-package import. Turning the compiler options off would strip the tarball
 * and take that with it.
 *
 * Payoff, unpacked: 596K off headless, 261K off web, 135K off core and 47K off
 * theme in a consumer's `node_modules`.
 */
const strip = (directory) => {
  const dist = join(root, directory, 'dist')
  const maps = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry)
      if (statSync(path).isDirectory()) {
        walk(path)
      } else if (path.endsWith('.map')) {
        maps.push(path)
      } else if (/\.(js|cjs|mjs|d\.ts|d\.cts|d\.mts)$/.test(path)) {
        const code = readFileSync(path, 'utf8')
        const clean = code.replace(/\n?\/\/# sourceMappingURL=.*$/gm, '')
        if (clean !== code) {
          writeFileSync(path, clean.endsWith('\n') ? clean : `${clean}\n`)
        }
      }
    }
  }
  try {
    walk(dist)
  } catch {
    return 0
  }
  for (const path of maps) {
    rmSync(path)
  }
  return maps.length
}

/**
 * Refuses a package whose `files` names something absent, before any of the
 * domain is published.
 *
 * **npm packs what is there and says nothing about what is not**, so a missing
 * entry publishes a package without it. For most packages the build is what
 * makes the file and the build has run. For a platform package it is the
 * release placing a binary built on another runner, and one that did not
 * arrive published an empty package that installs cleanly and runs nothing.
 *
 * **A binary is also held to what it has to be to run**: executable, since an
 * artifact download drops the mode, and reporting this release's version where
 * this machine can run it, since the binary builds from the crate's own version
 * line and that is stamped separately from the manifest.
 */
const incomplete = (directory, manifest) => {
  const problems = []
  for (const entry of manifest.files ?? []) {
    if (!entry.includes('*') && !existsSync(join(root, directory, entry))) {
      problems.push(`\`files\` names \`${entry}\` and there is none`)
    }
  }
  if (manifest.os === undefined || problems.length > 0) {
    return problems
  }
  for (const entry of manifest.files ?? []) {
    const binary = join(root, directory, entry)
    if (!manifest.os.includes('win32') && (statSync(binary).mode & 0o111) === 0) {
      problems.push(`\`${entry}\` is not executable`)
      continue
    }
    if (!manifest.os.includes(process.platform) || !manifest.cpu?.includes(process.arch)) {
      continue
    }
    const said = run(binary, ['--version'], root).trim()
    if (!said.endsWith(` ${manifest.version}`)) {
      problems.push(`\`${entry} --version\` says \`${said}\`, not ${manifest.version}`)
    }
  }
  return problems
}

const refusals = packages.flatMap(([, { directory, manifest }]) =>
  incomplete(directory, manifest).map((problem) => `  ${directory}: ${problem}`),
)
if (refusals.length > 0) {
  fail(
    `Refusing to publish ${domain}, since npm would pack what is there:\n\n${refusals.join('\n')}`,
  )
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
  /* **Stripped before the pack, never by reopening the tarball.** Unpacking,
     deleting the maps and re-tarring breaks the archive: BSD tar writes an
     entry for `package/` and the registry answers `415 invalid path: package/`,
     and it writes AppleDouble `._name` companions for files carrying macOS
     xattrs. Stripping `dist` first means bun packs a tree that is already
     correct and nothing touches the archive afterwards, which is what makes the
     file's own promise true: what is packed is what is published. */
  const dropped = strip(directory)
  run('bun', ['pm', 'pack', '--destination', into], join(root, directory))
  const [file] = readdirSync(into)
  if (file === undefined) {
    fail(`${directory}: packed nothing.`)
  }

  /* The stale-lockfile fault, refused before it reaches the registry rather
     than after, because a published version cannot be taken back. */
  const packed = JSON.parse(run('tar', ['-xzOf', join(into, file), 'package/package.json'], root))
  for (const [dependency, range] of Object.entries({
    ...packed.dependencies,
    ...packed.optionalDependencies,
  })) {
    if (domainOf(dependency) === domain && range !== version) {
      fail(
        `${name}@${version} would ship a dependency on \`${dependency}@${range}\`. Run ` +
          '`bun install` after stamping the version: `bun pm pack` reads the sibling version ' +
          'from `bun.lock`, not from the manifest.',
      )
    }
  }

  console.log(`  ${name}@${version} (${file}, ${dropped} source maps stripped)`)
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
