#!/usr/bin/env node
/**
 * Registers every published package with the workflows allowed to publish it.
 *
 * Trusted publishing replaces the stored npm token with an OIDC exchange: the
 * workflow proves which repository, which workflow file and which environment
 * it is, and npm hands back publish rights that live for one job. There is no
 * credential in the repository, nothing to rotate, and nothing to leak. It is
 * also what npm's own UI tells you to use instead of a bypass-2FA token.
 *
 * **The relationship is per package and per workflow file**, so ten packages
 * published by two workflows is twenty registrations, which is why they are
 * written down here rather than made by hand.
 *
 * **Bound to an environment.** `--environment` is the part worth having:
 * `release.yml` may publish only from `production` and `release-experimental.yml`
 * only from `experimental`. A workflow file added later, or an existing one run
 * outside its environment, has no publish rights at all. That makes the
 * governance gate cryptographic rather than procedural, which is a stronger
 * claim than a required reviewer alone.
 *
 * **A 403 is about the credential, not about the package.** A missing package
 * looks like the same thing and is not. Measured against npm 11.18.0 with
 * `@fusion.dev/cortex-docs` published and confirmed present: `npm trust list`
 * under a granular token returned 403, while the same command in the same
 * minute under the logged-in session returned `EOTP` and asked for a one-time
 * password. A 403 that turns into an `EOTP` when only the credential changes is
 * a statement about the credential.
 *
 * **So a token cannot do this, however much it is allowed to publish.** npm is
 * restricting tokens that bypass 2FA for account and settings changes, and
 * attaching a trusted publisher is a settings change. This needs the session,
 * and the session has to get past two-factor:
 *
 *   - Two-factor on "authorization only": every call below runs unattended.
 *   - On "authorization and writes": each one wants a one-time password, and a
 *     passkey account has no code to type. npm offers a browser challenge
 *     instead, which this file cannot present, because the `execFileSync` below
 *     pipes stdio and nothing reaches the terminal. It fails once per
 *     registration and reports 403 for none of them.
 *
 * The package does have to exist, and npm/cli#8544 asks for that to change and
 * is still open. It is simply not what a 403 tells you.
 *
 * Bootstrapping is still a real step and it still comes first:
 *
 *   bun run build
 *   node tooling/scripts/publish.mjs --domain helix --tag bootstrap
 *   node tooling/scripts/publish.mjs --domain cortex --tag bootstrap
 *   bun run trust --apply
 *
 * That publishes the resting version, `0.0.0-dev`, under a `bootstrap` dist-tag,
 * from a machine that is already logged in. A pre-release sorts below every real
 * version and is ignored by version allocation, so it occupies no number and
 * can never be mistaken for a release. It exists so that the package does, and
 * for no other reason.
 *
 * **`--tag bootstrap` does not keep it off `latest`.** npm points `latest` at
 * the first version a package ever receives whatever `--tag` asked for:
 * measured, `@fusion.dev/cortex-docs` came back carrying `bootstrap` and
 * `latest` on the same `0.0.0-dev`. The pre-release rule protects ranges and not
 * bare installs: `^1.0.0` can never resolve to a pre-release, while
 * `npm i @fusion.dev/cortex-docs` resolves `latest` and gets the placeholder.
 *
 * It corrects itself at the first real release, when promotion moves `latest`
 * onto a version that was staged and proved. Until then `latest` is a stub, on
 * restricted packages with no consumers, so the window costs nothing. Taking
 * the tag off earlier is untested: the npm CLI carries no guard against
 * `dist-tag rm latest` and sends the DELETE, and whether the registry accepts
 * one was not tried, there being no package to try it on but the bootstrap
 * itself.
 *
 * Read this next to `publish.mjs`, which refuses `--tag latest` outright so
 * nothing reaches `latest` that no smoke test ran. The bootstrap gets there
 * anyway, by a route that file cannot see, and it is the one publish where that
 * does not matter.
 *
 * From a laptop deliberately. The alternative, a token in CI for the first
 * release and removed afterwards, means a publish credential exists in the
 * repository at some point, and the whole reason for trusted publishing is that
 * one never does.
 *
 * Prints what it would do. Pass `--apply` to actually do it, because this
 * changes settings on the npm registry rather than anything in this repository.
 *
 *   node tooling/scripts/trust.mjs
 *   node tooling/scripts/trust.mjs --apply
 */
import { execFileSync } from 'node:child_process'
import { domainOf, manifests, publishes } from './lib/workspace.mjs'

const REPOSITORY = 'project-fusion/fusion'

/** Which workflow may publish, and the environment it must be running in. */
const PUBLISHERS = [
  { environment: 'production', file: 'release.yml' },
  { environment: 'experimental', file: 'release-experimental.yml' },
]

const apply = process.argv.includes('--apply')
const packages = [...manifests()]
  .filter(([name, { manifest }]) => domainOf(name) !== undefined && publishes(manifest))
  .map(([name]) => name)
  .sort()

if (packages.length === 0) {
  console.error('No published packages found.')
  process.exit(1)
}

let failed = 0
const denied = new Set()
const challenged = new Set()
for (const name of packages) {
  for (const { environment, file } of PUBLISHERS) {
    const args = [
      'trust',
      'github',
      name,
      '--file',
      file,
      '--repo',
      REPOSITORY,
      '--env',
      environment,
      '--allow-publish',
      '--yes',
    ]
    if (!apply) {
      console.log(`  npm ${args.join(' ')}`)
      continue
    }
    try {
      execFileSync('npm', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
      console.log(`  ${name} <- ${file} (${environment})`)
    } catch (error) {
      failed += 1
      /* npm's own message, rather than "Command failed". Getting this wrong is
         how a registry error becomes an afternoon. */
      const output = String(error.stderr ?? error.message)
      console.error(`  ${name} <- ${file} (${environment}) FAILED`)
      console.error(`    ${output.trim().split('\n').join('\n    ')}`)
      if (/403|forbidden/i.test(output)) {
        denied.add(name)
      }
      if (/EOTP|one-time password/i.test(output)) {
        challenged.add(name)
      }
    }
  }
}

if (!apply) {
  console.log(
    `\n${packages.length} packages x ${PUBLISHERS.length} workflows = ` +
      `${packages.length * PUBLISHERS.length} registrations. Re-run with --apply to make them.`,
  )
  process.exit(0)
}
if (failed > 0) {
  console.error(`\n${failed} registrations failed.`)
  if (denied.size > 0) {
    console.error(
      '\nA 403 is about the credential, not about the package. Attaching a trusted publisher is ' +
        'a settings change, and npm blocks tokens that bypass 2FA from making one, so a token ' +
        'that publishes without complaint still gets 403 here. Run this as the logged-in ' +
        'session, with no `_authToken` in the environment:\n\n' +
        '  npm whoami\n' +
        '  bun run trust --apply\n\n' +
        'If it already ran that way, then check the package exists, because npm cannot attach a ' +
        'trusted publisher to one that was never published. `npm view <name>` returning 404 is ' +
        'what that looks like, and bootstrap is the fix:\n\n' +
        '  bun run build\n' +
        '  node tooling/scripts/publish.mjs --domain helix --tag bootstrap\n' +
        '  node tooling/scripts/publish.mjs --domain cortex --tag bootstrap\n',
    )
  }
  if (challenged.size > 0) {
    console.error(
      '\nnpm wants a one-time password for each of these, which is two-factor set to ' +
        '"authorization and writes". It offers a browser challenge, and this script cannot ' +
        'present one: the `execFileSync` above pipes stdio, so the prompt goes nowhere and every ' +
        'registration fails the same way. A passkey account has no code to pass either.\n\n' +
        'Set two-factor to "authorization only" in npm\'s web settings, re-run, and set it back. ' +
        'Login stays behind the passkey throughout, and CI is unaffected either way, because ' +
        'trusted publishing authenticates by OIDC and never sees this.\n',
    )
  }
  process.exit(1)
}
console.log(`\ntrust: ${packages.length * PUBLISHERS.length} registrations in place`)
