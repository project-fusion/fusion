#!/usr/bin/env node
/**
 * Every spec file is reached by the script that claims to run the specs.
 *
 * **A spec nobody runs is the `check:prose:dialect` fault in a different costume.** It
 * is written, it is reviewed, it is committed, it goes green because it is never
 * executed, and it protects nothing. `helix/headless` runs `bun test dom.spec`
 * and `bun test ssr.spec`, so a pure spec named `order.spec.ts` sat between the
 * two patterns and ran in neither: 24 assertions covering the one bug the module
 * exists to prevent, none of them executed by `bun run verify`.
 *
 * The suffix names the process a spec needs, which is why there are three:
 * `.dom.spec.ts` wants happy-dom, `.ssr.spec.ts` wants Lit SSR and cannot share
 * a process with it, and `.pure.spec.ts` wants neither. This holds the three
 * against the scripts, in both directions:
 *
 * - a spec file whose suffix no `test:*` script matches is unreachable;
 * - a package holding a suffix with no script for it is the same fault seen
 *   from the manifest instead of the file.
 *
 * Packages that run `bun test src` wholesale are exempt: they reach everything
 * by construction, which is the arrangement `helix/core` uses and the reason it
 * has never had this problem.
 *
 * Run with `bun run check:spec:spec-runners`.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** The suffixes a spec may carry, and the script each one belongs to. */
const RUNNERS = {
  'dom.spec.ts': 'test:dom',
  'pure.spec.ts': 'test:pure',
  'ssr.spec.ts': 'test:ssr',
}

const problems = []

/** Every workspace package with a `src` and a `test` script. */
const packages = []
for (const domain of ['helix', 'cortex', 'fusion', 'tooling']) {
  let entries
  try {
    entries = readdirSync(join(ROOT, domain), { withFileTypes: true })
  } catch {
    continue
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }
    const directory = join(ROOT, domain, entry.name)
    try {
      packages.push({
        directory,
        manifest: JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')),
      })
    } catch {
      /* Not a package. */
    }
  }
}

/** Every `*.spec.ts` under a directory. */
const specs = (from, found = []) => {
  let entries
  try {
    entries = readdirSync(from, { withFileTypes: true })
  } catch {
    return found
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist') {
      continue
    }
    const path = join(from, entry.name)
    if (entry.isDirectory()) {
      specs(path, found)
    } else if (entry.name.endsWith('.spec.ts')) {
      found.push(path)
    }
  }
  return found
}

let checked = 0
for (const { directory, manifest } of packages) {
  const scripts = manifest.scripts ?? {}
  const test = scripts.test
  if (!test) {
    continue
  }
  const found = specs(join(directory, 'src'))
  if (found.length === 0) {
    continue
  }

  /* A wholesale run reaches every file under `src`, so the suffixes are a naming
     convention there rather than a routing decision, and nothing to hold. */
  if (/\bbun test src\b/.test(test)) {
    checked += found.length
    continue
  }

  const used = new Set()
  for (const path of found) {
    const suffix = Object.keys(RUNNERS).find((one) => path.endsWith(one))
    if (!suffix) {
      problems.push(
        `${relative(ROOT, path)} ends in none of ${Object.keys(RUNNERS).join(', ')}, so no \`test:*\` script reaches it and it never runs`,
      )
      continue
    }
    used.add(suffix)
    const runner = RUNNERS[suffix]
    if (!scripts[runner]) {
      problems.push(
        `${manifest.name} holds ${relative(ROOT, path)} and declares no \`${runner}\` script, so that spec never runs`,
      )
    } else if (!test.includes(runner)) {
      problems.push(
        `${manifest.name} declares \`${runner}\` and its \`test\` script does not call it, so that spec never runs`,
      )
    }
    checked += 1
  }
}

if (problems.length > 0) {
  console.error(`Specs nothing runs (${problems.length}):\n`)
  for (const problem of problems) {
    console.error(`  ${problem}`)
  }
  console.error('')
  process.exit(1)
}

console.log(`spec-runners: ${checked} spec files, every one reached by the package's own \`test\``)
