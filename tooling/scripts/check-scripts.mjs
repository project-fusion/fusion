#!/usr/bin/env node
/**
 * Every `bun run` inside a manifest names a script that manifest can reach.
 *
 * **A manifest reaches its own scripts and no others.** A `catalog` call inside
 * `site/ui` runs the `catalog` that package declares, and a root script of the
 * same name is not a fallback: measured from `helix/core`, `bun run fix:order` answers
 * `Script not found` while the root declares it. So the same words mean
 * different things in different manifests and neither one can borrow from the
 * other, which is exactly the ambiguity a rename walks into.
 *
 * **The second is what happened, on 28 Aug 2026.** Renaming the root writers to
 * `gen:*` rewrote every `catalog` call to `gen:catalog` inside
 * `site/ui/package.json`, where `catalog`, `frame`, `specs` and `wasm` are that
 * package's own scripts and the turbo tasks behind `turbo watch`. Ten call
 * sites across `build`, `dev` and `typecheck`. The tree stayed green through a
 * full `check` of all 77 guards and the pre-push hook, and `bun run build`
 * answered `Script not found "gen:catalog"`.
 *
 * **`check:pkg:prerequisites` catches half of this and it is worth saying which
 * half.** It holds a package's `typecheck` to building what its `build` builds,
 * so a rename that misses one script leaves the siblings disagreeing and is
 * reported. A rename that hits every script in a manifest leaves them agreeing
 * perfectly about a name that does not exist, which is the shape a mechanical
 * pass produces by construction. Measured both ways against the real fault:
 * broken in one script, `prerequisites` reports it; broken in all three, every
 * guard in the repository passes.
 *
 * **Keys are not this.** `fix:order` sorts a manifest and never reads a value,
 * and reported `all package manifests already ordered` against the tree that
 * could not build.
 *
 * Only `bun run`. `turbo run <task>` resolves against turbo's own task graph
 * rather than a manifest, `bunx` and `npx` reach node_modules, and a shell
 * fragment is not a claim about this repository. A false positive here would be
 * a check nobody trusts.
 *
 * Run with `bun run check:pkg:scripts` (also part of `bun run verify`).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { manifests, root } from './lib/workspace.mjs'

/** `bun run <name>`, stopping before flags and shell operators. */
const CALL = /bun run ([a-z][a-z0-9:-]*)/g

/* **The root is read separately, because `manifests()` does not return it.**
   That helper answers "which workspace packages are there" and the root is not
   one of them. Taking its absence for an empty script list makes every package
   call to a root script a finding, and leaves the root's own chains unchecked,
   which are the reference-dense ones: `verify` alone is eighty calls. */
const rootManifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

const found = new Map([
  [rootManifest.name, { directory: '', manifest: rootManifest }],
  ...manifests(),
])

const problems = []
let checked = 0

for (const [name, { directory, manifest }] of found) {
  const scripts = manifest.scripts ?? {}
  const own = new Set(Object.keys(scripts))
  for (const [key, value] of Object.entries(scripts)) {
    for (const [, called] of String(value).matchAll(CALL)) {
      checked += 1
      if (own.has(called)) {
        continue
      }
      const where = directory === '' ? 'the root manifest' : `${directory}/package.json`
      problems.push(
        `${where}: \`${key}\` runs \`bun run ${called}\`, and ${name} declares no ` +
          'such script.',
      )
    }
  }
}

if (problems.length > 0) {
  console.error(`Manifest scripts calling something that is not there (${problems.length}):`)
  for (const problem of problems) {
    console.error(`  ${problem}`)
  }
  console.error(
    '\n  A manifest reaches its own scripts and nothing else, so this fails the\n' +
      '  moment it runs. A root script of the same name is not a fallback. If the\n' +
      '  call was meant for the root, it belongs in a root script.\n',
  )
  process.exit(1)
}

console.log(
  `scripts: ${checked} \`bun run\` calls across ${found.size} manifests, every one answered`,
)
