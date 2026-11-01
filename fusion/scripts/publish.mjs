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
 * **Promotion authenticates the way publishing does, by trusted publishing.**
 * `npm dist-tag` performs the OIDC exchange from npm 11.21.0 and 12.2.0, and each
 * package's trusted publisher needs "Allow npm dist-tag" turned on, which is off
 * by default and has no `npm trust` flag. `trust.mjs` prints where to turn it on.
 * `--preflight` proves it for every package before the release spends a number.
 *
 * Related and worth reading before building around this: npm now has
 * `npm stage publish`, a first-class staged release that may express exactly
 * the publish-then-promote shape this file implements by hand.
 *
 *   node fusion/scripts/publish.mjs --domain helix --tag next
 *   node fusion/scripts/publish.mjs --domain helix --tag next --dry-run
 *   node fusion/scripts/publish.mjs --domain helix --tag exp-0 --otp 123456
 *   node fusion/scripts/publish.mjs --domain helix --promote latest --version 1.4.0
 *   node fusion/scripts/publish.mjs --domain helix --preflight
 *   node fusion/scripts/publish.mjs --domain helix --bootstrap
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
import { argument, flag } from '@fusion.dev/scripts/argv'
import { minifyJson } from '@fusion.dev/scripts/minify-json'
import { stripMapComment } from '@fusion.dev/scripts/strip-map-comment'
import { DOMAINS, domainOf, manifests, publishes, root } from '@fusion.dev/scripts/workspace'

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
const preflight = flag('preflight')
const bootstrap = flag('bootstrap')

if (!Object.keys(DOMAINS).includes(domain)) {
  fail(`--domain must be one of ${Object.keys(DOMAINS).join(', ')}, not \`${domain}\`.`)
}
if (promote === undefined && tag === undefined && !preflight && !bootstrap) {
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
  } catch (first) {
    let error = first
    /* **A passkey is answered in a browser, and a pipe shows no browser.** The
       call above pipes stdio to keep npm's message, so the challenge npm offers
       on `EOTP` had nowhere to appear and a person at the keyboard could not
       satisfy it: measured 13 Sep 2026, the first bootstrap stopped at its first
       package. So it is asked once more on the terminal, which prints the link
       and waits, as `trust.mjs` does. CI never gets here: OIDC is exempt. */
    if (/EOTP|one-time password/i.test(`${first.stderr ?? ''}${first.stdout ?? ''}`)) {
      console.error(`\nnpm wants a one-time password to ${doing}. Answer it here:\n`)
      try {
        execFileSync('npm', args, { cwd: root, stdio: 'inherit' })
        return ''
      } catch (again) {
        error = again
      }
    }
    const output = `${error.stderr ?? ''}${error.stdout ?? ''}`.trim()
    console.error(`\nnpm could not ${doing}.\n`)
    const empty = error === first ? '  (npm said nothing)' : '  (npm printed its reason above)'
    console.error(output === '' ? empty : `  ${output.split('\n').join('\n  ')}`)

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
    if (promote !== undefined && /\b40[13]\b|ENEEDAUTH|dist-tag/i.test(output)) {
      const name = args[2].slice(0, args[2].lastIndexOf('@'))
      console.error(
        `\n  The trusted publisher may not allow moving tags.\n\n${allowDistTag([name])}`,
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

/**
 * The domain's packages the registry has never seen.
 *
 * **Trusted publishing cannot publish a package for the first time**, npm
 * attaching a publisher to a package rather than to a scope. A release that
 * reaches a new one has published every package before it, and stops: the
 * domain half out under `next` and a number spent. So it is asked before the
 * number is allocated.
 */
const unpublished = () => {
  const absent = []
  for (const [name] of packages) {
    try {
      run('npm', ['view', name, 'name'], root)
    } catch (error) {
      const said = `${error.stderr ?? ''}${error.stdout ?? ''}`.trim()
      if (!/E404|404 Not Found/.test(said)) {
        fail(`Could not ask the registry about ${name}:\n\n  ${said.split('\n').join('\n  ')}`)
      }
      absent.push(name)
    }
  }
  return absent
}

/** The steps that let a trusted publisher move a package's tags, for a person to follow. */
const allowDistTag = (names) =>
  `  On npmjs.com, open each package's settings and edit the trusted publisher for ` +
  `\`.github/workflows/release.yml\` in the \`production\` environment. Turn on "Allow npm ` +
  `dist-tag" and save.\n\n${names.map((name) => `    https://www.npmjs.com/package/${name}/access`).join('\n')}\n`

/**
 * The domain's packages whose trusted publisher cannot move a tag.
 *
 * **"Allow npm dist-tag" is set per package and is off by default**, and a new
 * package starts without it. A release that reached such a package would publish
 * the domain, prove it, and move `latest` on the packages before that one, with a
 * number spent. So this moves a tag on every package, before the number is
 * allocated, and names every package that refuses.
 *
 * **Only where the job can make the exchange.** On a laptop this would ask for a
 * one-time password per package and prove nothing about the workflow.
 *
 * The tag points at the version `latest` already names, and is removed at once.
 * A package without the permission answers `403`, "This trusted publisher cannot
 * manage dist-tags", measured November 1, 2026, on npm 11.21.1.
 */
const CHECK_TAG = 'promote-check'

/**
 * Takes the tag off again. A tag left behind is untidy and changes nothing a
 * consumer installs, so a removal that keeps failing warns and the release goes on.
 * The add has already proved the permission.
 */
const removeCheckTag = (name) => {
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      run('npm', ['dist-tag', 'rm', name, CHECK_TAG], root)
      return
    } catch {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5_000)
    }
  }
  console.error(`::warning::${name} still carries the \`${CHECK_TAG}\` tag. Remove it by hand.`)
}

const cannotPromote = () => {
  if (!process.env.ACTIONS_ID_TOKEN_REQUEST_URL) {
    return []
  }
  const refused = []
  for (const [name] of packages) {
    try {
      const version = run('npm', ['view', name, 'version'], root).trim()
      run('npm', ['dist-tag', 'add', `${name}@${version}`, CHECK_TAG], root)
    } catch (error) {
      const said = `${error.stderr ?? ''}${error.stdout ?? ''}`.split('\n')
      console.error(`  ${name}: ${said.find((line) => /npm error 4\d\d/.test(line)) ?? said[0]}`)
      refused.push(name)
      continue
    }
    removeCheckTag(name)
  }
  return refused
}

if (preflight) {
  const absent = unpublished()
  if (absent.length > 0) {
    fail(
      `${domain}: never published, and trusted publishing cannot publish a package the first ` +
        `time:\n\n${absent.map((name) => `  ${name}`).join('\n')}\n\n` +
        '  Once, from a machine that is logged in, publish the placeholder and register the ' +
        `workflows:\n\n    bun run build\n    node fusion/scripts/publish.mjs --domain ${domain} ` +
        '--bootstrap\n    bun run trust --apply\n',
    )
  }
  const refused = cannotPromote()
  if (refused.length > 0) {
    fail(
      `${domain}: trusted publishing cannot move a tag on ${refused.length} of ${packages.length} ` +
        `packages, so the release would stop after staging.\n\n${allowDistTag(refused)}`,
    )
  }
  console.log(`${domain}: every one of ${packages.length} packages is on the registry`)
  process.exit(0)
}

/**
 * Publishes each package the registry has never seen, once, at `0.0.0-dev`
 * under `exp-0`, so it exists for `bun run trust --apply` to register.
 *
 * The resting version `trust.mjs` describes: a pre-release sorts below every
 * real version and version allocation ignores it, so it spends no number. It
 * is a placeholder and ships as one, a platform package without its binary
 * included, since nothing resolves to `0.0.0-dev` by asking for a range.
 *
 * Written into the manifest for the pack and put back after it, the manifests
 * carrying the last release.
 */
if (bootstrap) {
  const absent = new Set(unpublished())
  const staging = mkdtempSync(join(tmpdir(), `${domain}-bootstrap-`))
  const placeholder = tag ?? 'exp-0'
  for (const [name, { directory, file, manifest }] of packages) {
    if (!absent.has(name)) {
      continue
    }
    const original = readFileSync(file, 'utf8')
    const into = join(staging, name.replace('@', '').replace('/', '-'))
    mkdirSync(into, { recursive: true })
    try {
      writeFileSync(
        file,
        `${JSON.stringify({ ...JSON.parse(original), version: '0.0.0-dev' }, null, 2)}\n`,
      )
      run('bun', ['pm', 'pack', '--destination', into], join(root, directory))
    } finally {
      writeFileSync(file, original)
    }
    const [tarball] = readdirSync(into)
    console.log(`  ${name}@0.0.0-dev under \`${placeholder}\``)
    if (!dry) {
      npm(
        [
          'publish',
          join(into, tarball),
          '--tag',
          placeholder,
          '--access',
          manifest.publishConfig.access,
          ...(otp === undefined ? [] : ['--otp', otp]),
        ],
        `publish the placeholder for ${name}`,
      )
    }
  }
  console.log(
    absent.size === 0
      ? `${domain}: nothing to bootstrap, every package is on the registry`
      : `${domain}: ${absent.size} placeholders ${dry ? 'packed (dry run)' : 'published'}. ` +
          'Now `bun run trust --apply`, which registers the workflows for each.',
  )
  process.exit(0)
}

/* Promotion: no build, no pack, no publish. A pointer moves. */
if (promote !== undefined) {
  if (pinned === undefined) {
    fail('--promote needs --version, so the tag is moved onto a release rather than onto "newest".')
  }
  /* **Trusted publishing moves the tag**, so this finds no credential in CI and
     npm makes the exchange per package. It came back `401` on the dist-tags
     endpoint on August 31, 2026, before npm 11.21.0 and the "Allow npm dist-tag"
     permission. On a machine that is logged in, it uses that session. */
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
        const clean = stripMapComment(code)
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
 * Packs each JSON file `files` names without its whitespace, and hands back
 * the bytes that saves and what writes the files back as they were.
 *
 * **Every reader parses them, so the whitespace is for a person reading the
 * repository.** `helix api`, `helix component`, `helix diagnostics`, `helix
 * manifest diff`, `helix mcp` and `helix scan` read them with a JSON parser,
 * the diagnostics fetch `lint.json` from a CDN and parse the response, and
 * editor tooling reads a custom elements manifest the same way. No reader
 * compares their bytes or reports a line in them.
 *
 * **The manifests are what this is for.** `api.json`, `examples.json` and
 * `lint.json` are written compact already. Measured October 10, 2026, on
 * 0.205.2: `@fusion.dev/helix`'s manifest goes from 13,524,637 bytes to
 * 9,226,244, headless's from 11,238,177 to 7,811,736 and core's from 1,439,085
 * to 939,801. That is 8.2 MB off what an install of `@fusion.dev/helix`
 * unpacks, and 0.8 MB off the three tarballs.
 *
 * **Written back after the pack**, as `--bootstrap` does with the version.
 * `helix manifest build` writes the pretty form on purpose, for `manifest
 * diff` and for a person reading what a layer produced, and a check that
 * compares a generated file with its generator reads the working tree. Only a
 * file that parses is touched, so the result parses to the same value.
 */
const squeeze = (directory, manifest) => {
  const kept = []
  let saved = 0
  for (const entry of manifest.files ?? []) {
    const path = join(root, directory, entry)
    if (!entry.endsWith('.json') || !existsSync(path)) {
      continue
    }
    const text = readFileSync(path, 'utf8')
    try {
      JSON.parse(text)
    } catch {
      continue
    }
    const small = minifyJson(text)
    if (small === text) {
      continue
    }
    kept.push([path, text])
    saved += Buffer.byteLength(text) - Buffer.byteLength(small)
    writeFileSync(path, small)
  }
  return {
    restore: () => {
      for (const [path, text] of kept) {
        writeFileSync(path, text)
      }
    },
    saved,
  }
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
 * this machine can run it.
 *
 * **The version is asked from inside the package, which is where the answer
 * is.** The binary reads it at run time from the `package.json` beside it, so
 * one build serves every release and this is the step that proves the pair
 * agree: it runs the file that is about to be packed, from the directory it is
 * about to be packed from, which is exactly the arrangement a consumer
 * installs. A binary compiled before that change, or one built from another
 * tree, answers with something else and is refused here.
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
  const squeezed = squeeze(directory, manifest)
  try {
    run('bun', ['pm', 'pack', '--destination', into], join(root, directory))
  } finally {
    squeezed.restore()
  }
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

  console.log(
    `  ${name}@${version} (${file}, ${dropped} source maps stripped, ` +
      `${squeezed.saved.toLocaleString('en-US')} bytes of JSON whitespace removed)`,
  )
  if (!dry) {
    npm(
      [
        'publish',
        join(into, file),
        '--tag',
        tag,
        '--access',
        manifest.publishConfig.access,
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
