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
 * published by two workflows is twenty registrations. That is exactly the sort
 * of thing done by hand once, wrongly, and discovered on a release night, so it
 * is written down here instead.
 *
 * **Bound to an environment.** `--environment` is the part worth having:
 * `release.yml` may publish only from `production` and `release-experimental.yml`
 * only from `experimental`. A workflow file added later, or an existing one run
 * outside its environment, has no publish rights at all. That makes the
 * governance gate cryptographic rather than procedural, which is a stronger
 * claim than a required reviewer alone.
 *
 * **The package has to exist first, and `npm trust` does not change that.**
 * Measured on 20 Aug 2026 against npm 11.18.0: every registration returned
 * `403 Forbidden` on `POST /-/package/<pkg>/trust`, and `npm trust list` on the
 * same package returned 403 for a plain GET, which needs no permission at all.
 * `npm view @helix-io/styled` returned 404. The packages did not exist, and that
 * is the whole cause; auth was fine, and the 2FA line in that output is an
 * unrelated deprecation notice. npm/cli#8544, which asks for exactly this, is
 * still open.
 *
 * So bootstrapping is a real step and it comes first:
 *
 *   bun run build
 *   node tooling/scripts/publish.mjs --domain helix --tag bootstrap
 *   node tooling/scripts/publish.mjs --domain cortex --tag bootstrap
 *   bun run trust --apply
 *
 * That publishes the resting version, `0.0.0-dev`, under a `bootstrap` dist-tag,
 * from a machine that is already logged in. A pre-release sorts below every real
 * version and is ignored by version allocation, so it occupies no number and can
 * never be mistaken for a release, and `bootstrap` is not a tag anything
 * resolves by default. It exists so that the package does, and for no other
 * reason.
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
import { domainOf, manifests, publishes } from './workspace.mjs'

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
const missing = new Set()
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
        missing.add(name)
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
  if (missing.size > 0) {
    console.error(
      '\nA 403 here almost always means the package does not exist yet. A trusted publisher is ' +
        'attached to a package, and npm cannot attach one to a package that has never been ' +
        'published. Confirm with `npm view <name>`, and if it 404s, bootstrap first:\n\n' +
        '  bun run build\n' +
        '  node tooling/scripts/publish.mjs --domain helix --tag bootstrap\n' +
        '  node tooling/scripts/publish.mjs --domain cortex --tag bootstrap\n' +
        '  bun run trust --apply\n',
    )
  }
  process.exit(1)
}
console.log(`\ntrust: ${packages.length * PUBLISHERS.length} registrations in place`)
