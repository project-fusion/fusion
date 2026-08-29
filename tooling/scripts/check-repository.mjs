#!/usr/bin/env node
/**
 * Holds every reference to this repository to the one place that says where it is.
 *
 * **A move leaves residue and nothing notices.** A published manifest carries
 * its `repository.url` into every tarball and onto its npm page, `source.ts`
 * builds the View Source link on every reference page from it, and `CODEOWNERS`
 * names a team under the org.
 *
 * **The shape of the fault is the duplication**, so the root `package.json`
 * declares the URL once, which is the conventional field for it and is
 * declarative there rather than published, the root being private.
 *
 * **`FORMER` is a list and that is deliberate.** The alternative is inferring
 * which `github.com` paths are ours, which cannot be done: `facebook/react` and
 * `rust-lang/crates.io-index` are in this tree too and are nobody's mistake. A
 * move is an event, so recording the name it moved from is the honest way to
 * catch what the move missed, and the check says so when it fires.
 *
 * Run with `bun run check:prose:repository` (also part of `bun run verify`).
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = join(import.meta.dirname, '../..')
/* `worktrees` for the reason `check-dialect.mjs` skips it: `.claude/worktrees`
   is gitignored scratch holding whole checkouts of this repository, so walking
   into one finds an older copy of every file here, including this check, whose
   own `FORMER` list names the paths it exists to refuse. Reported as two
   findings in a tree with nothing wrong with it. */
const SKIP = new Set([
  '.git',
  '.local',
  '.next',
  '.next-dev',
  '.turbo',
  'dist',
  'node_modules',
  'worktrees',
])

/** Paths this repository has lived at before. Add one when it moves again. */
const FORMER = ['former-org/former-repo', 'former-org/fusion']

/** `owner/name`, from the one field that declares it. */
const canonical = (() => {
  const { repository } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  const found = /github\.com\/([\w.-]+\/[\w.-]+?)(?:\.git)?$/.exec(repository?.url ?? '')
  if (!found) {
    console.error(
      'The root `package.json` does not declare `repository.url`, so nothing says where this ' +
        'repository lives and every other reference to it is unverifiable.',
    )
    process.exit(1)
  }
  return found[1]
})()

const walk = (dir) => {
  const found = []
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) {
      continue
    }
    const path = join(dir, entry)
    found.push(...(statSync(path).isDirectory() ? walk(path) : [path]))
  }
  return found
}

const problems = []
let manifests = 0
let mentions = 0

for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file)
  if (rel === 'tooling/scripts/check-repository.mjs') {
    continue
  }
  let source
  try {
    source = readFileSync(file, 'utf8')
  } catch {
    continue
  }

  /* Somewhere this repository has lived and no longer does. */
  for (const stale of FORMER) {
    if (source.includes(stale)) {
      problems.push(
        `${rel}: names \`${stale}\`, which is where this repository used to live. It is at ` +
          `\`${canonical}\` now. If it has moved again, add the previous path to \`FORMER\` in this ` +
          'check so the next move is caught the same way.',
      )
    }
  }

  /* Every manifest agrees with the root, `directory` aside. */
  if (rel.endsWith('package.json')) {
    let parsed
    try {
      parsed = JSON.parse(source)
    } catch {
      continue
    }
    const url = parsed.repository?.url
    if (url === undefined) {
      continue
    }
    manifests += 1
    if (!url.includes(canonical)) {
      problems.push(
        `${rel}: \`repository.url\` is \`${url}\`, and the root says \`${canonical}\`. A published ` +
          'package carries this into its tarball and onto its npm page, so a manifest that ' +
          'disagrees points readers at a repository that is not this one.',
      )
    }
  }

  mentions += source.includes(canonical) ? 1 : 0
}

if (problems.length > 0) {
  console.error(
    `References to a repository we do not live at (${problems.length}):\n\n  ${problems.join('\n\n  ')}\n`,
  )
  process.exit(1)
}

console.log(
  `repository: \`${canonical}\`, named by ${mentions} files and agreed by ${manifests} manifests`,
)
